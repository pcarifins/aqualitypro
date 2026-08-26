import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { store } from "./src/data/storageEngine";
import {
  fetchRealSharePointPPCData,
  resolveSharePointDriveItem,
  DEFAULT_SHAREPOINT_PPC_URL,
} from "./server/sharepointGraphService";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // --- REST API ENDPOINTS ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "KRA Test Record", time: new Date().toISOString() });
  });

  // --- SHAREPOINT PPC ENDPOINTS ---
  app.get("/api/sharepoint/status", async (req, res) => {
    const hasTenant = !!process.env.MICROSOFT_TENANT_ID;
    const hasClient = !!process.env.MICROSOFT_CLIENT_ID;
    const hasSecret = !!process.env.MICROSOFT_CLIENT_SECRET;
    const sharingUrl = process.env.SHAREPOINT_PPC_FILE_URL || DEFAULT_SHAREPOINT_PPC_URL;

    res.json({
      configured: hasTenant && hasClient && hasSecret,
      missingConfig: [
        !hasTenant && 'MICROSOFT_TENANT_ID',
        !hasClient && 'MICROSOFT_CLIENT_ID',
        !hasSecret && 'MICROSOFT_CLIENT_SECRET',
      ].filter(Boolean),
      sharingUrl,
      targetFileName: "Priority Testing - PPC.xlsx",
      mode: hasTenant && hasClient && hasSecret ? 'MICROSOFT_GRAPH' : 'ANONYMOUS_FIRST',
    });
  });

  app.get("/api/sharepoint/driveItem", async (req, res) => {
    try {
      const sharingUrl = (req.query.url as string) || process.env.SHAREPOINT_PPC_FILE_URL || DEFAULT_SHAREPOINT_PPC_URL;
      const { metadata } = await resolveSharePointDriveItem(sharingUrl);
      res.json({
        success: true,
        driveId: metadata.driveId,
        itemId: metadata.itemId,
        fileName: metadata.fileName,
        webUrl: metadata.webUrl,
        lastModifiedDateTime: metadata.lastModifiedDateTime,
        accessMode: metadata.accessMode,
      });
    } catch (err: any) {
      res.status(err.message?.includes('AUTHENTICATION REQUIRED') ? 400 : 500).json({
        success: false,
        error: err.message || "Failed to resolve driveItem from Microsoft Graph",
      });
    }
  });

  app.get("/api/sharepoint/ppc-data", async (req, res) => {
    try {
      const result = await fetchRealSharePointPPCData();
      res.json(result);
    } catch (err: any) {
      console.error("[SharePoint PPC API Error]:", err.message);
      const isAuthError =
        err.message?.includes('AUTHENTICATION REQUIRED') ||
        err.message?.includes('MICROSOFT_CONFIGURATION_REQUIRED');
      res.status(isAuthError ? 400 : 500).json({
        success: false,
        error: err.message || "SHAREPOINT AUTHENTICATION REQUIRED: Failed to fetch binary XLSX data from SharePoint.",
        code: isAuthError ? "SHAREPOINT_AUTHENTICATION_REQUIRED" : "GRAPH_SYNC_ERROR",
      });
    }
  });

  app.post("/api/sharepoint/auth", (req, res) => {
    const { email, name } = req.body;
    res.json({
      success: true,
      email: email || "ppc.admin@komatsu.co.id",
      name: name || "PPC Administrator",
    });
  });

  app.post("/api/sharepoint/sync", async (req, res) => {
    try {
      const { currentUser } = req.body;
      const activeModels = store.getProductModels(true);

      // Fetch and parse REAL Excel data from SharePoint sharing link
      const excelResult = await fetchRealSharePointPPCData();
      const realSharePointData = excelResult.items;

      const quarantined: any[] = [];
      let addedCount = 0;
      let updatedCount = 0;
      let unchangedCount = 0;
      let invalidCount = 0;
      let conflictCount = 0;

      const currentQueue = store.getQueueRecords();

      for (const row of realSharePointData) {
        // 1. PRODUCT MASTER GATING: Verify unitModel and component match an ACTIVE entry in Product Master
        const matchingModel = activeModels.find(
          (m) =>
            m.unitModel.trim().toUpperCase() === row.unitModel.trim().toUpperCase() &&
            m.component.trim().toUpperCase() === row.component.trim().toUpperCase() &&
            m.active === true
        );

        if (!matchingModel) {
          invalidCount++;
          quarantined.push({
            joNumber: row.joRoNumber,
            unitModel: row.unitModel,
            component: row.component,
            reason: "INVALID: Product Model or Component combination does not exist in active Product Master",
          });
          continue;
        }

        // 2. CHECK DUPLICATE JO (Both Manual and SharePoint sourced JOs)
        const cleanJo = row.joRoNumber.trim().toUpperCase();
        const existing = currentQueue.find(
          (q) => q.joRoNumber.trim().toUpperCase() === cleanJo && q.status !== 'FINISH'
        );

        if (existing) {
          // Check if JO is already RUNNING / ON_PROCESS / RECEIVED
          const isExecuting =
            existing.status === 'ON_PROCESS' ||
            !!existing.receivingTime ||
            !!existing.gltReceivingTime ||
            existing.priorityLocked === true;

          // Check if there is an unmergable operational conflict (e.g. attempting to alter component on running job)
          if (
            isExecuting &&
            (existing.compGroup !== matchingModel.compGroup ||
              existing.component.toUpperCase() !== row.component.toUpperCase() ||
              existing.unitModel.toUpperCase() !== row.unitModel.toUpperCase())
          ) {
            conflictCount++;
            quarantined.push({
              joNumber: row.joRoNumber,
              reason: "CONFLICT: Active testing JO already in execution with conflicting unit/component specification",
            });
            continue;
          }

          // 3. DIFF + UPSERT: Only update safe non-execution metadata
          let hasDiff = false;
          const updates: any = {};

          if (row.customer && existing.customer !== row.customer) {
            updates.customer = row.customer;
            hasDiff = true;
          }
          if (row.serialNumber && existing.serialNumber !== row.serialNumber) {
            updates.serialNumber = row.serialNumber;
            hasDiff = true;
          }
          if (row.partNumber && existing.partNumber !== row.partNumber) {
            updates.partNumber = row.partNumber;
            hasDiff = true;
          }
          if (row.assemblyMechanic && existing.assemblyMechanic !== row.assemblyMechanic) {
            updates.assemblyMechanic = row.assemblyMechanic;
            hasDiff = true;
          }
          if (row.targetDate && existing.targetDate !== row.targetDate) {
            updates.targetDate = row.targetDate;
            hasDiff = true;
          }
          if (matchingModel.subGroup && existing.subGroup !== matchingModel.subGroup) {
            updates.subGroup = matchingModel.subGroup;
            hasDiff = true;
          }

          // If not yet running and plannedPriority differs, only update if not manually locked
          if (!isExecuting && row.plannedPriority && existing.plannedPriority !== row.plannedPriority) {
            updates.plannedPriority = row.plannedPriority;
            hasDiff = true;
          }

          if (hasDiff) {
            await store.updateQueueRecord(existing.queueRecordId, updates);
            updatedCount++;
          } else {
            unchangedCount++;
          }
        } else {
          // 4. ADD NEW SHAREPOINT JO
          const isUrgent = row.isUrgent === true;
          const compGroup = matchingModel.compGroup;
          const subGroup = matchingModel.subGroup || row.subGroup || null;

          // Normal priority = highest active priority in group + 1
          const activeRankedInGroup = currentQueue.filter(
            (q) =>
              q.compGroup === compGroup &&
              !q.isUrgentUnassigned &&
              (q.status === 'WAITING' || q.status === 'ON_PROCESS')
          );
          const maxPrio = activeRankedInGroup.reduce(
            (max, q) => Math.max(max, q.currentPriority || 0),
            0
          );
          const nextPrio = maxPrio + 1;
          const assignedPriority = isUrgent ? 999 : (row.plannedPriority || nextPrio);

          const newRecord: any = {
            queueRecordId: `qr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            joRoNumber: cleanJo,
            compGroup,
            subGroup,
            unitModel: row.unitModel.trim().toUpperCase(),
            component: row.component.trim().toUpperCase(),
            productModelId: matchingModel.id,
            productMasterId: matchingModel.id,
            testType: row.testType || 'PROD',
            plannedPriority: assignedPriority,
            currentPriority: assignedPriority,
            isUrgentUnassigned: isUrgent,
            status: 'WAITING',
            priorityLocked: false,
            customer: row.customer || 'Internal Stock',
            partNumber: row.partNumber || '',
            serialNumber: row.serialNumber || '',
            assemblyMechanic: row.assemblyMechanic || 'Unassigned',
            targetDate: row.targetDate,
            remark: row.remark,
            source: 'SHAREPOINT',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            history: [
              {
                oldPriority: 0,
                newPriority: assignedPriority,
                remark: `Imported from SharePoint Excel ${excelResult.metadata.fileName} (${excelResult.sheetName})`,
                changedBy: currentUser || 'SharePoint Sync',
                changedAt: new Date().toISOString(),
              },
            ],
          };

          if (row.testType === 'RETEST') {
            newRecord.aiRecommendation = {
              suggestedPriority: 1,
              reason: 'Retest inspection item with priority delivery requirement.',
            };
          }

          await store.addQueueRecord(newRecord, currentUser || 'SharePoint Sync');
          addedCount++;
        }
      }

      // Trigger normalization to maintain consistent priorities cleanly
      await store.normalizeQueuePriorities();

      res.json({
        success: true,
        added: addedCount,
        updated: updatedCount,
        unchanged: unchangedCount,
        invalid: invalidCount,
        conflict: conflictCount,
        quarantined,
        fileName: excelResult.metadata.fileName,
        rowsRead: excelResult.rowsRead,
        sheetName: excelResult.sheetName,
      });
    } catch (err: any) {
      console.error("[SharePoint Sync Error]:", err.message);
      const isAuthError =
        err.message?.includes('AUTHENTICATION REQUIRED') ||
        err.message?.includes('MICROSOFT_CONFIGURATION_REQUIRED');
      res.status(isAuthError ? 400 : 500).json({
        success: false,
        error: err.message || "SHAREPOINT AUTHENTICATION REQUIRED: Could not read Excel file from SharePoint.",
        code: isAuthError ? "SHAREPOINT_AUTHENTICATION_REQUIRED" : "SYNC_ERROR",
      });
    }
  });

  // Users
  app.get("/api/users", (req, res) => {
    res.json(store.getUsers());
  });

  app.post("/api/users", async (req, res) => {
    try {
      await store.saveUser(req.body);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Product Models
  app.get("/api/product-models", (req, res) => {
    const onlyActive = req.query.onlyActive === "true";
    res.json(store.getProductModels(onlyActive));
  });

  app.post("/api/product-models", async (req, res) => {
    try {
      const { model, actorName } = req.body;
      await store.saveProductModel(model, actorName);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Checksheet Templates
  app.get("/api/checksheet-templates", (req, res) => {
    const filter = {
      compGroup: req.query.compGroup as any,
      unitModel: req.query.unitModel as string,
      component: req.query.component as string,
      testStage: req.query.testStage as any,
      status: req.query.status as any,
    };
    res.json(store.getChecksheetTemplates(filter));
  });

  app.post("/api/checksheet-templates", async (req, res) => {
    try {
      const { template, actorName } = req.body;
      await store.saveChecksheetTemplate(template, actorName);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Queue Records
  app.get("/api/queue-records", (req, res) => {
    const compGroup = req.query.compGroup as any;
    res.json(store.getQueueRecords(compGroup));
  });

  app.post("/api/queue-records", async (req, res) => {
    try {
      const { record, actorName } = req.body;
      await store.addQueueRecord(record, actorName);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/queue-records/:id", async (req, res) => {
    try {
      await store.updateQueueRecord(req.params.id, req.body);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GLT Records
  app.get("/api/glt-records", (req, res) => {
    res.json(store.getGLTRecords());
  });

  app.post("/api/glt-records", async (req, res) => {
    try {
      const saved = await store.saveGLTRecord(req.body);
      res.json(saved);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Dyno Records
  app.get("/api/dyno-records", (req, res) => {
    res.json(store.getDynoRecords());
  });

  app.post("/api/dyno-records", async (req, res) => {
    try {
      const saved = await store.saveDynoRecord(req.body);
      res.json(saved);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Hydraulic Records
  app.get("/api/hydraulic-records", (req, res) => {
    res.json(store.getHydraulicRecords());
  });

  app.post("/api/hydraulic-records", async (req, res) => {
    try {
      const saved = await store.saveHydraulicRecord(req.body);
      res.json(saved);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Testing Lines
  app.get("/api/testing-lines", (req, res) => {
    const onlyActive = req.query.onlyActive === "true";
    res.json(store.getTestingLines(onlyActive));
  });

  app.post("/api/testing-lines", async (req, res) => {
    try {
      const { line, actorName } = req.body;
      await store.saveTestingLine(line, actorName);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Test Overrides
  app.get("/api/test-overrides", (req, res) => {
    res.json(store.getTestOverrides());
  });

  app.post("/api/test-overrides", async (req, res) => {
    try {
      const { override, actorName } = req.body;
      await store.saveTestOverride(override, actorName);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Audit Logs
  app.get("/api/audit-logs", (req, res) => {
    res.json(store.getAuditLogs());
  });

  // Assemblers
  app.get("/api/assemblers", (req, res) => {
    const onlyActive = req.query.onlyActive === "true";
    res.json(store.getAssemblers(onlyActive));
  });

  app.post("/api/assemblers", async (req, res) => {
    try {
      const { assembler, actorName } = req.body;
      await store.saveAssembler(assembler, actorName);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Combined JO Data for Details/Reports
  app.get("/api/jo-records/:joNumber", (req, res) => {
    const results = store.getCombinedJOHistory({ joNumber: req.params.joNumber });
    const jo = results.find(r => r.joNumber.toUpperCase() === req.params.joNumber.toUpperCase()) || results[0];
    if (!jo) {
      res.status(404).json({ error: "JO not found" });
    } else {
      res.json(jo);
    }
  });

  // PDF Reports
  app.get("/api/pdf-reports/:joNumber", (req, res) => {
    res.json(store.getPDFReportsForJO(req.params.joNumber));
  });

  // Quality Certificates
  app.get("/api/certificates/:joNumber", (req, res) => {
    res.json(store.getCertificatesForJO(req.params.joNumber));
  });

  // --- VITE SPA SERVING ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
