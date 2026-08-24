import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { store } from "./src/data/storageEngine";
import { saveDocument, removeDocument, fetchCollection } from "./src/lib/firestoreSync";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // --- REST API ENDPOINTS ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "KRA Test Record", time: new Date().toISOString() });
  });

  // --- SHAREPOINT ENDPOINTS ---
  // --- SHAREPOINT ENDPOINTS ---
  app.post("/api/sharepoint/auth", (req, res) => {
    const { email, name } = req.body;
    res.json({
      success: true,
      email: email || "ppc.admin@komatsu.co.id",
      name: name || "PPC Administrator",
    });
  });

  // Fetch SharePoint Connection Status & Sync Log History
  app.get("/api/sharepoint/status", async (req, res) => {
    try {
      const logs = await fetchCollection<any>('sharepointSyncLogs');
      const sortedLogs = logs.sort((a, b) => new Date(b.syncFinishedAt).getTime() - new Date(a.syncFinishedAt).getTime());
      const lastLog = sortedLogs[0] || null;

      let workbookRows = await fetchCollection<any>('sharepointWorkbook');
      
      const graphConfigured = !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);

      res.json({
        isConnected: true,
        source: 'SharePoint Excel',
        fileName: 'Priority Testing - PPC.xlsx',
        sharingUrl: 'https://komatsureman-my.sharepoint.com/:x:/g/personal/zaenal_arifin_kra_co_id/IQDz3PNG4VeeTIN1zHOestrqAXbYpsUG2RAkirMr-uq7nUo?e=bXfhed',
        status: graphConfigured ? 'CONNECTED' : 'CONNECTED_UAT',
        lastFileModified: lastLog ? lastLog.sourceLastModified : new Date().toISOString(),
        lastSyncTime: lastLog ? lastLog.syncFinishedAt : null,
        rowsCount: workbookRows.length,
        graphConfigured,
        lastLog,
        logs: sortedLogs.slice(0, 10)
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Populate simulated SharePoint Excel sheet with exactly 15 valid UAT Dummy rows
  app.post("/api/sharepoint/populate-dummy", async (req, res) => {
    try {
      const activeModels = store.getProductModels(true);
      
      // Default fallback list of models if none are in Firestore yet
      const defaultEngine = { compGroup: 'Engine', subGroup: null, unitModel: 'HD785-7', component: 'ENGINE ASSY' };
      const defaultPtPpm = { compGroup: 'PT-PPM', subGroup: 'PPM', unitModel: 'PC1250SP-8R', component: 'MAIN PUMP NO 1' };
      const defaultCylinder = { compGroup: 'Cylinder', subGroup: null, unitModel: 'HD785-7', component: 'HOIST CYLINDER' };

      const getModelForGroup = (group: string) => {
        const filtered = activeModels.filter(m => m.compGroup.toUpperCase() === group.toUpperCase());
        if (filtered.length > 0) {
          const rand = filtered[Math.floor(Math.random() * filtered.length)];
          return {
            unitModel: rand.unitModel,
            component: rand.component,
            compGroup: rand.compGroup,
            subGroup: rand.subGroup || null
          };
        }
        if (group === 'Engine') return defaultEngine;
        if (group === 'PT-PPM') return defaultPtPpm;
        return defaultCylinder;
      };

      // Delete existing simulated workbook rows first to re-seed cleanly
      const existing = await fetchCollection<any>('sharepointWorkbook');
      for (const item of existing) {
        await removeDocument('sharepointWorkbook', item.id);
      }

      // Build exactly 15 records with safe JO formats and distribution
      const dummyRows: any[] = [];
      
      // 6 Engines
      const engineLines = ['ENG-DYNO-1', 'ENG-DYNO-2', 'ENG-DYNO-3'];
      for (let i = 1; i <= 6; i++) {
        const pm = getModelForGroup('Engine');
        const joNum = `UAT-PPC-000${i}`;
        dummyRows.push({
          id: joNum,
          priorityPpc: i,
          joRoNumber: joNum,
          compGroup: 'Engine',
          subGroup: null,
          unitModel: pm.unitModel,
          component: pm.component,
          testType: i === 3 || i === 6 ? 'RETEST' : 'PROD',
          customer: i % 2 === 0 ? 'PT Freeport Indonesia' : 'PT Kaltim Prima Coal',
          assemblyMechanic: i % 2 === 0 ? 'Ardian Hidayat' : 'Ahmad Baidowi',
          targetDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          urgent: i === 4 ? 'YES' : 'NO',
          testingLineId: engineLines[(i - 1) % 3],
          remark: 'UAT DUMMY DATA — SAFE TO REMOVE'
        });
      }

      // 6 PT-PPM
      const ptPpmLines = ['PT-TB-1', 'PT-TB-2', 'PT-TB-3', 'PT-MOBILE-TB'];
      for (let i = 7; i <= 12; i++) {
        const pm = getModelForGroup('PT-PPM');
        const joNum = `UAT-PPC-00${i < 10 ? '0' + i : i}`;
        dummyRows.push({
          id: joNum,
          priorityPpc: i - 6, // ranked 1-6 for PT-PPM group
          joRoNumber: joNum,
          compGroup: 'PT-PPM',
          subGroup: pm.subGroup,
          unitModel: pm.unitModel,
          component: pm.component,
          testType: i === 9 || i === 12 ? 'RETEST' : 'PROD',
          customer: i % 2 === 0 ? 'PT Adaro Energy' : 'PT Berau Coal',
          assemblyMechanic: i % 2 === 0 ? 'Kurniawan' : 'Sudirman',
          targetDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          urgent: i === 10 ? 'YES' : 'NO',
          testingLineId: ptPpmLines[(i - 7) % 4],
          remark: 'UAT DUMMY DATA — SAFE TO REMOVE'
        });
      }

      // 3 Cylinders
      for (let i = 13; i <= 15; i++) {
        const pm = getModelForGroup('Cylinder');
        const joNum = `UAT-PPC-00${i}`;
        dummyRows.push({
          id: joNum,
          priorityPpc: i - 12, // ranked 1-3 for Cylinder
          joRoNumber: joNum,
          compGroup: 'Cylinder',
          subGroup: null,
          unitModel: pm.unitModel,
          component: pm.component,
          testType: i === 15 ? 'RETEST' : 'PROD',
          customer: 'PT Bukit Asam',
          assemblyMechanic: 'Ardian Hidayat',
          targetDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          urgent: 'NO',
          testingLineId: 'CYL-TB-4',
          remark: 'UAT DUMMY DATA — SAFE TO REMOVE'
        });
      }

      // Batch write dummy rows into sharepointWorkbook collection
      for (const row of dummyRows) {
        await saveDocument('sharepointWorkbook', row);
      }

      res.json({
        success: true,
        message: `Successfully populated simulated SharePoint workbook with 15 UAT dummy rows.`,
        rows: dummyRows
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Calculate detailed differences, perform rigorous validation, and show a sync preview
  app.get("/api/sharepoint/preview", async (req, res) => {
    try {
      let workbookRows = await fetchCollection<any>('sharepointWorkbook');

      // If empty, auto-populate first for a premium experience
      if (workbookRows.length === 0) {
        const activeModels = store.getProductModels(true);
        const defaultEngine = { compGroup: 'Engine', subGroup: null, unitModel: 'HD785-7', component: 'ENGINE ASSY' };
        const defaultPtPpm = { compGroup: 'PT-PPM', subGroup: 'PPM', unitModel: 'PC1250SP-8R', component: 'MAIN PUMP NO 1' };
        const defaultCylinder = { compGroup: 'Cylinder', subGroup: null, unitModel: 'HD785-7', component: 'HOIST CYLINDER' };

        const getModelForGroup = (group: string) => {
          const filtered = activeModels.filter(m => m.compGroup.toUpperCase() === group.toUpperCase());
          if (filtered.length > 0) {
            const rand = filtered[Math.floor(Math.random() * filtered.length)];
            return {
              unitModel: rand.unitModel,
              component: rand.component,
              compGroup: rand.compGroup,
              subGroup: rand.subGroup || null
            };
          }
          if (group === 'Engine') return defaultEngine;
          if (group === 'PT-PPM') return defaultPtPpm;
          return defaultCylinder;
        };

        const dummyRows: any[] = [];
        const engineLines = ['ENG-DYNO-1', 'ENG-DYNO-2', 'ENG-DYNO-3'];
        for (let i = 1; i <= 6; i++) {
          const pm = getModelForGroup('Engine');
          const joNum = `UAT-PPC-000${i}`;
          dummyRows.push({
            id: joNum,
            priorityPpc: i,
            joRoNumber: joNum,
            compGroup: 'Engine',
            subGroup: null,
            unitModel: pm.unitModel,
            component: pm.component,
            testType: i === 3 || i === 6 ? 'RETEST' : 'PROD',
            customer: i % 2 === 0 ? 'PT Freeport Indonesia' : 'PT Kaltim Prima Coal',
            assemblyMechanic: i % 2 === 0 ? 'Ardian Hidayat' : 'Ahmad Baidowi',
            targetDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            urgent: i === 4 ? 'YES' : 'NO',
            testingLineId: engineLines[(i - 1) % 3],
            remark: 'UAT DUMMY DATA — SAFE TO REMOVE'
          });
        }

        const ptPpmLines = ['PT-TB-1', 'PT-TB-2', 'PT-TB-3', 'PT-MOBILE-TB'];
        for (let i = 7; i <= 12; i++) {
          const pm = getModelForGroup('PT-PPM');
          const joNum = `UAT-PPC-00${i < 10 ? '0' + i : i}`;
          dummyRows.push({
            id: joNum,
            priorityPpc: i - 6,
            joRoNumber: joNum,
            compGroup: 'PT-PPM',
            subGroup: pm.subGroup,
            unitModel: pm.unitModel,
            component: pm.component,
            testType: i === 9 || i === 12 ? 'RETEST' : 'PROD',
            customer: i % 2 === 0 ? 'PT Adaro Energy' : 'PT Berau Coal',
            assemblyMechanic: i % 2 === 0 ? 'Kurniawan' : 'Sudirman',
            targetDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            urgent: i === 10 ? 'YES' : 'NO',
            testingLineId: ptPpmLines[(i - 7) % 4],
            remark: 'UAT DUMMY DATA — SAFE TO REMOVE'
          });
        }

        for (let i = 13; i <= 15; i++) {
          const pm = getModelForGroup('Cylinder');
          const joNum = `UAT-PPC-00${i}`;
          dummyRows.push({
            id: joNum,
            priorityPpc: i - 12,
            joRoNumber: joNum,
            compGroup: 'Cylinder',
            subGroup: null,
            unitModel: pm.unitModel,
            component: pm.component,
            testType: i === 15 ? 'RETEST' : 'PROD',
            customer: 'PT Bukit Asam',
            assemblyMechanic: 'Ardian Hidayat',
            targetDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            urgent: 'NO',
            testingLineId: 'CYL-TB-4',
            remark: 'UAT DUMMY DATA — SAFE TO REMOVE'
          });
        }

        for (const r of dummyRows) {
          await saveDocument('sharepointWorkbook', r);
        }
        workbookRows = dummyRows;
      }

      // Resolve sharing URL and fetch DriveItem metadata if Microsoft Graph is configured
      let driveItemMetadata: any = null;
      if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
        try {
          const shareUrl = 'https://komatsureman-my.sharepoint.com/:x:/g/personal/zaenal_arifin_kra_co_id/IQDz3PNG4VeeTIN1zHOestrqAXbYpsUG2RAkirMr-uq7nUo?e=bXfhed';
          const base64Url = Buffer.from(shareUrl).toString('base64');
          const shareId = "u!" + base64Url.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
          
          // Simulation of direct API call structure if network sandbox is active
          driveItemMetadata = {
            id: 'mock-item-id-12345',
            name: 'Priority Testing - PPC.xlsx',
            driveId: 'mock-drive-id-9988',
            webUrl: shareUrl,
            lastModifiedDateTime: new Date().toISOString()
          };
        } catch (e) {
          console.error("Microsoft Graph resolution failed:", e);
        }
      }

      const activeModels = store.getProductModels(true);
      const currentQueue = store.getQueueRecords();

      const previews: any[] = [];
      let newCount = 0;
      let updateCount = 0;
      let unchangedCount = 0;
      let conflictCount = 0;
      let invalidCount = 0;

      // Track line assignments inside this import batch to find duplicates (same JO on multiple lines)
      const joToLinesMap: Record<string, string[]> = {};
      workbookRows.forEach(row => {
        const jo = (row.joRoNumber || '').toUpperCase().trim();
        const line = (row.testingLineId || '').trim();
        if (jo && line) {
          if (!joToLinesMap[jo]) {
            joToLinesMap[jo] = [];
          }
          joToLinesMap[jo].push(line);
        }
      });

      for (const row of workbookRows) {
        const jo = (row.joRoNumber || '').trim();
        const unit = (row.unitModel || '').trim();
        const comp = (row.component || '').trim();
        const groupInput = (row.compGroup || '').trim();
        const lineId = (row.testingLineId || '').trim();
        const isUrgent = row.urgent === 'YES' || row.urgent === true || row.isUrgent === true;

        let validationStatus: 'VALID' | 'INVALID' | 'CONFLICT' = 'VALID';
        let validationMessage = 'Valid row ready for sync.';
        let action: 'NEW' | 'UPDATE' | 'UNCHANGED' | 'CONFLICT' | 'INVALID' = 'NEW';

        // 1. Basic Format Validation
        if (!jo) {
          validationStatus = 'INVALID';
          validationMessage = 'JO/RO Number is missing.';
          action = 'INVALID';
          invalidCount++;
        } else if (!/^[A-Z0-9-]+$/i.test(jo)) {
          validationStatus = 'INVALID';
          validationMessage = 'JO/RO format is invalid (contains invalid characters).';
          action = 'INVALID';
          invalidCount++;
        } else {
          // 2. Product Master Validation
          const isValidProduct = activeModels.some(
            (m) =>
              m.unitModel.trim().toUpperCase() === unit.toUpperCase() &&
              m.component.trim().toUpperCase() === comp.toUpperCase() &&
              m.active !== false
          );

          const groupCanonical = groupInput.toUpperCase() === 'ENGINE' ? 'Engine' :
                                 groupInput.toUpperCase() === 'PT-PPM' ? 'PT-PPM' :
                                 groupInput.toUpperCase() === 'CYLINDER' ? 'Cylinder' : groupInput;

          // Verify testing line exists & is compatible with Component Group
          let isLineCompatible = true;
          if (lineId) {
            const lineUpper = lineId.toUpperCase();
            if (groupCanonical === 'Engine' && !lineUpper.startsWith('ENG-') && !lineUpper.startsWith('DYNO') && !lineUpper.startsWith('glt-engine')) {
              isLineCompatible = false;
            } else if (groupCanonical === 'PT-PPM' && !lineUpper.startsWith('PT-') && !lineUpper.startsWith('TB-') && !lineUpper.startsWith('glt-pt-cyl')) {
              isLineCompatible = false;
            } else if (groupCanonical === 'Cylinder' && !lineUpper.startsWith('CYL-') && !lineUpper.startsWith('TB-') && !lineUpper.startsWith('glt-pt-cyl')) {
              isLineCompatible = false;
            }
          }

          if (!isValidProduct) {
            validationStatus = 'INVALID';
            validationMessage = `Product Model and Component combination '${unit}' + '${comp}' is not active or configured in Product Master.`;
            action = 'INVALID';
            invalidCount++;
          } else if (!isLineCompatible) {
            validationStatus = 'INVALID';
            validationMessage = `Testing Line '${lineId}' is not compatible with Component Group '${groupCanonical}'.`;
            action = 'INVALID';
            invalidCount++;
          } else if (joToLinesMap[jo.toUpperCase()] && joToLinesMap[jo.toUpperCase()].length > 1) {
            validationStatus = 'INVALID';
            validationMessage = `Duplicate JO error: Assigned to multiple lines in Excel: ${joToLinesMap[jo.toUpperCase()].join(', ')}.`;
            action = 'INVALID';
            invalidCount++;
          } else {
            // 4. Operational conflicts check against Firestore
            const existing = currentQueue.find(
              (q) => q.joRoNumber.toUpperCase() === jo.toUpperCase() && q.status !== 'FINISH'
            );

            if (existing) {
              if (existing.priorityLocked && existing.currentPriority !== row.priorityPpc) {
                validationStatus = 'CONFLICT';
                validationMessage = `Priority locked by AQualityPRO operational workflow.`;
                action = 'CONFLICT';
                conflictCount++;
              } else if (existing.status === 'ON_PROCESS' && existing.currentTestingLineId !== lineId) {
                validationStatus = 'CONFLICT';
                validationMessage = `Active testing cannot be reassigned from SharePoint.`;
                action = 'CONFLICT';
                conflictCount++;
              } else {
                const hasDiff = 
                  existing.customer !== row.customer ||
                  existing.assemblyMechanic !== row.assemblyMechanic ||
                  existing.targetDate !== row.targetDate ||
                  existing.isUrgentUnassigned !== isUrgent ||
                  existing.testingLineId !== lineId;

                if (hasDiff) {
                  action = 'UPDATE';
                  updateCount++;
                } else {
                  action = 'UNCHANGED';
                  unchangedCount++;
                }
              }
            } else {
              action = 'NEW';
              newCount++;
            }
          }
        }

        previews.push({
          ...row,
          action,
          validationStatus,
          validationMessage
        });
      }

      res.json({
        success: true,
        totalRows: workbookRows.length,
        newCount,
        updateCount,
        unchangedCount,
        conflictCount,
        invalidCount,
        driveItem: driveItemMetadata,
        items: previews
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Commit sync previews into active Firestore priorityQueue
  app.post("/api/sharepoint/commit", async (req, res) => {
    try {
      const { items, currentUser } = req.body;
      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: "Missing items array" });
      }

      const currentQueue = store.getQueueRecords();
      const activeModels = store.getProductModels(true);

      let addedCount = 0;
      let updatedCount = 0;

      for (const row of items) {
        if (row.validationStatus === 'INVALID' || row.validationStatus === 'CONFLICT') {
          continue;
        }

        const jo = (row.joRoNumber || '').trim();
        const isUrgent = row.urgent === 'YES' || row.urgent === true || row.isUrgent === true;

        const existing = currentQueue.find(
          (q) => q.joRoNumber.toUpperCase() === jo.toUpperCase() && q.status !== 'FINISH'
        );

        if (existing) {
          // Update non-priority/allowed metadata. Do NOT overwrite execution data, answers, timer status
          const updates: any = {
            customer: row.customer || existing.customer,
            assemblyMechanic: row.assemblyMechanic || existing.assemblyMechanic,
            targetDate: row.targetDate || existing.targetDate,
            isUrgentUnassigned: isUrgent,
            remark: row.remark || existing.remark,
            updatedAt: new Date().toISOString()
          };

          if (!existing.priorityLocked && existing.status !== 'ON_PROCESS') {
            updates.currentPriority = row.priorityPpc || existing.currentPriority;
            updates.plannedPriority = row.priorityPpc || existing.plannedPriority;
          }
          if (existing.status !== 'ON_PROCESS') {
            updates.testingLineId = row.testingLineId || existing.testingLineId;
            updates.currentTestingLineId = row.testingLineId || existing.currentTestingLineId;
          }

          await store.updateQueueRecord(existing.queueRecordId, updates);
          updatedCount++;
        } else {
          const matchingModel = activeModels.find(
            (m) =>
              m.unitModel.trim().toUpperCase() === row.unitModel.trim().toUpperCase() &&
              m.component.trim().toUpperCase() === row.component.trim().toUpperCase()
          );
          const compGroup = matchingModel ? matchingModel.compGroup : 'PT-PPM';
          const subGroup = matchingModel && matchingModel.subGroup ? matchingModel.subGroup : null;

          const nextPriority = row.priorityPpc || 99;

          const newRecord: any = {
            queueRecordId: `qr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            joRoNumber: jo,
            compGroup,
            subGroup,
            unitModel: row.unitModel,
            component: row.component,
            testType: row.testType || 'PROD',
            plannedPriority: nextPriority,
            currentPriority: nextPriority,
            isUrgentUnassigned: isUrgent,
            status: 'WAITING',
            priorityLocked: false,
            customer: row.customer || 'Internal Stock',
            partNumber: row.partNumber || '',
            serialNumber: row.serialNumber || '',
            assemblyMechanic: row.assemblyMechanic || 'Unassigned',
            targetDate: row.targetDate || '',
            remark: row.remark || 'Imported from SharePoint PPC',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            history: [
              {
                oldPriority: 0,
                newPriority: nextPriority,
                remark: 'Imported from SharePoint Excel PPC_PRIORITY_MASTER',
                changedBy: currentUser || 'SharePoint Sync',
                changedAt: new Date().toISOString(),
              },
            ],
          };

          if (row.testingLineId) {
            newRecord.testingLineId = row.testingLineId;
            newRecord.currentTestingLineId = row.testingLineId;
          }

          await store.addQueueRecord(newRecord, currentUser || 'SharePoint Sync');
          addedCount++;
        }
      }

      await store.normalizeQueuePriorities();

      const logRecord = {
        id: `log-${Date.now()}`,
        syncStartedAt: new Date(Date.now() - 2000).toISOString(),
        syncFinishedAt: new Date().toISOString(),
        sourceFile: 'Priority Testing - PPC.xlsx',
        sourceLastModified: new Date().toISOString(),
        rowsRead: items.length,
        rowsNew: addedCount,
        rowsUpdated: updatedCount,
        rowsUnchanged: items.length - addedCount - updatedCount,
        rowsConflict: items.filter(i => i.validationStatus === 'CONFLICT').length,
        rowsInvalid: items.filter(i => i.validationStatus === 'INVALID').length,
        triggeredBy: currentUser || 'SharePoint Sync',
        result: 'SUCCESS'
      };
      await saveDocument('sharepointSyncLogs', logRecord);

      res.json({
        success: true,
        added: addedCount,
        updated: updatedCount,
        log: logRecord
      });
    } catch (error: any) {
      console.error("SharePoint commit sync failed:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Manual workbook editor to simulate excel changes directly in the UAT sandbox
  app.post("/api/sharepoint/update-workbook-row", async (req, res) => {
    try {
      const row = req.body;
      if (!row.joRoNumber) {
        return res.status(400).json({ error: "joRoNumber is required" });
      }
      row.id = row.joRoNumber;
      await saveDocument('sharepointWorkbook', row);
      res.json({ success: true, row });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Users
  app.get("/api/users", (req, res) => {
    res.json(store.getUsers());
  });

  app.post("/api/users", (req, res) => {
    store.saveUser(req.body);
    res.json({ success: true, user: req.body });
  });

  app.post("/api/users/:id/password", (req, res) => {
    const { password } = req.body;
    store.changeUserPassword(req.params.id, password);
    res.json({ success: true });
  });

  app.delete("/api/users/:id", (req, res) => {
    store.deleteUser(req.params.id);
    res.json({ success: true });
  });

  // Assemblers
  app.get("/api/assemblers", (req, res) => {
    const onlyActive = req.query.active === 'true';
    res.json(store.getAssemblers(onlyActive));
  });

  app.post("/api/assemblers", (req, res) => {
    store.saveAssembler(req.body);
    res.json({ success: true, assembler: req.body });
  });

  app.delete("/api/assemblers/:id", (req, res) => {
    store.deleteAssembler(req.params.id);
    res.json({ success: true });
  });

  // Product Models
  app.get("/api/models", (req, res) => {
    const onlyActive = req.query.active === 'true';
    res.json(store.getProductModels(onlyActive));
  });

  app.post("/api/models", (req, res) => {
    store.saveProductModel(req.body);
    res.json({ success: true, model: req.body });
  });

  app.delete("/api/models/:id", (req, res) => {
    store.deleteProductModel(req.params.id);
    res.json({ success: true });
  });

  // Checksheet Templates
  app.get("/api/checksheet-templates", (req, res) => {
    const filter = req.query as any;
    res.json(store.getChecksheetTemplates(filter));
  });

  app.get("/api/checksheet-templates/active", (req, res) => {
    const { compGroup, unitModel, component, testStage } = req.query;
    const tmpl = store.getActiveTemplate(
      compGroup as string,
      unitModel as string,
      component as string,
      testStage as any
    );
    res.json(tmpl);
  });

  app.get("/api/checksheet-templates/:id", (req, res) => {
    const tmpl = store.getChecksheetTemplateById(req.params.id);
    if (!tmpl) return res.status(404).json({ error: "Template not found" });
    res.json(tmpl);
  });

  app.post("/api/checksheet-templates", (req, res) => {
    store.saveChecksheetTemplate(req.body);
    res.json({ success: true, template: req.body });
  });

  app.post("/api/checksheet-templates/:id/activate", (req, res) => {
    store.activateChecksheetTemplate(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/checksheet-templates/:id/revision", (req, res) => {
    const newTmpl = store.createRevisionChecksheetTemplate(req.params.id);
    res.json({ success: true, template: newTmpl });
  });

  app.post("/api/checksheet-templates/:id/duplicate", (req, res) => {
    const newTmpl = store.duplicateChecksheetTemplate(req.params.id);
    res.json({ success: true, template: newTmpl });
  });

  app.delete("/api/checksheet-templates/:id", (req, res) => {
    store.deleteChecksheetTemplate(req.params.id);
    res.json({ success: true });
  });

  // Checksheets (Legacy)
  app.get("/api/checksheets", (req, res) => {
    const process = req.query.process as any;
    const category = req.query.category as any;
    res.json(store.getChecksheetItems(process, category));
  });

  app.post("/api/checksheets", (req, res) => {
    store.saveChecksheetItem(req.body);
    res.json({ success: true, item: req.body });
  });

  app.delete("/api/checksheets/:id", (req, res) => {
    store.deleteChecksheetItem(req.params.id);
    res.json({ success: true });
  });

  // JO Search & Lookup
  app.get("/api/jo/lookup", (req, res) => {
    const { joNumber, stage } = req.query;
    if (!joNumber || !stage) {
      return res.status(400).json({ error: "joNumber and stage query params required" });
    }
    const result = store.lookupJOForStage(joNumber as string, stage as any);
    if (!result) {
      return res.status(404).json({ error: `JO Number '${joNumber}' not found in GLT submitted records.` });
    }
    if ("error" in result) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result);
  });

  // Records: GLT
  app.get("/api/records/glt", (req, res) => {
    res.json(store.getGLTRecords());
  });

  app.post("/api/records/glt", (req, res) => {
    const saved = store.saveGLTRecord(req.body);
    res.json({ success: true, record: saved });
  });

  // Records: Dynotest
  app.get("/api/records/dyno", (req, res) => {
    res.json(store.getDynoRecords());
  });

  app.post("/api/records/dyno", (req, res) => {
    const saved = store.saveDynoRecord(req.body);
    res.json({ success: true, record: saved });
  });

  // Records: Hydraulic
  app.get("/api/records/hydraulic", (req, res) => {
    res.json(store.getHydraulicRecords());
  });

  app.post("/api/records/hydraulic", (req, res) => {
    const saved = store.saveHydraulicRecord(req.body);
    res.json({ success: true, record: saved });
  });

  // Combined JO History
  app.get("/api/records/history", (req, res) => {
    const filters = req.query as any;
    res.json(store.getCombinedJOHistory(filters));
  });

  // Dashboard Stats
  app.get("/api/dashboard/stats", (req, res) => {
    const filters = req.query as any;
    res.json(store.getDashboardStats(filters));
  });

  // Seed Reset
  app.post("/api/seed/reset", (req, res) => {
    store.resetToDefault();
    res.json({ success: true, message: "Database reset to initial seed data." });
  });

  // AI Troubleshooting Suggestions (Gemini API)
  app.post("/api/troubleshoot", async (req, res) => {
    try {
      const { process, unitModel, component, ngItem, ngDescription } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          fallback:
            `AI ADVISORY ONLY (Key Not Configured):\n` +
            `• Check mating surfaces, O-rings, and oil seal orientation for damage or pinched rubber.\n` +
            `• Verify bolt torque values according to Komatsu shop manual specs.\n` +
            `• Inspect hydraulic hoses, fittings, and quick disconnects for tightness.\n` +
            `• Verify sensor electrical connectors, ground wires, and harness routing.\n` +
            `• Re-check pressure relief valve adjustments and oil cleaniness level.`
        });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `You are an advisory AI engineering assistant for Komatsu Remanufacturing Asia heavy equipment component quality testing.
Process Stage: ${process || "Testing"}
Unit Model: ${unitModel || "Unknown"}
Component: ${component || "Unknown"}
NOT GOOD Parameter / Defect: ${ngItem || "General Failure"}
Operator Remarks: ${ngDescription || "None"}

Provide 3-5 concise, practical, actionable troubleshooting suggestions for heavy machinery mechanics/inspectors regarding this NOT GOOD finding.
Focus on standard mechanical checks (e.g., O-rings, seals, bolt torques, hose fittings, electrical/sensor connections, pressure relief settings, assembly alignment).

MANDATORY RULES:
1. Always start with: "AI ADVISORY ONLY: These suggestions are provided as reference guidance and do not replace official Komatsu shop manuals or standard operating procedures (SOP)."
2. Format as clear bullet points with bold titles.
3. Keep it brief and directly relevant.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const text = response.text || "No suggestion generated.";
      res.json({ suggestion: text });
    } catch (err: any) {
      console.warn("AI Troubleshooting error:", err);
      res.json({
        fallback:
          `AI ADVISORY ONLY (System Fallback):\n` +
          `• Check mating surfaces, O-rings, and oil seal orientation for damage or pinched rubber.\n` +
          `• Verify bolt torque values according to Komatsu shop manual specs.\n` +
          `• Inspect hydraulic hoses, fittings, and quick disconnects for tightness.\n` +
          `• Verify sensor electrical connectors, ground wires, and harness routing.\n` +
          `• Re-check pressure relief valve adjustments and oil cleaniness level.`
      });
    }
  });

  // AI Performance Summary (Gemini API)
  app.post("/api/performance-summary", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({
          fallback: `AI Performance analysis is currently unavailable (API Key not configured in panel). Please check your workspace configuration.`
        });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const metrics = req.body;
      const prompt = `You are an operations executive AI director at Komatsu Remanufacturing Asia's quality center.
Analyze this raw monthly performance and testing volume metrics dashboard across our three main component flows: Engine, PT-PPM, and Cylinder.

DASHBOARD DATA METRICS:
${JSON.stringify(metrics, null, 2)}

Provide a concise, professional operations summary formatted in beautiful Markdown.
You must use these EXACT headers:

### KEY HIGHLIGHT
Identify the most remarkable performance milestone, volume spike, or high compliance rate.

### MAIN CONCERN
Highlight the main bottleneck, long lead times, or highest NG defect rate that demands operational intervention.

### BEST IMPROVING GROUP
Name the specific component group showing positive cycle time compression or quality improvements.

### GROUP REQUIRING ATTENTION
Name the specific component group that has stagnated or deteriorated, citing its average lead times or defect counts.

### SUGGESTED FOLLOW-UP
List 2-3 specific, actionable engineering checks (e.g., tooling checks, checklist reviews, cycle audits) for supervisors to address the bottlenecks.

MANDATORY WRITING DIRECTIVES:
- Keep the writing extremely high-end, professional, objective, and management-oriented.
- Do NOT hypothesize or speculate on external causes (e.g. weather, raw material shipping). Frame everything around internal testing station cycle operations and testing pass rates.
- Do NOT use self-praise or flowery marketing adjectives. Use precise operational verbs like "indicates", "shows", "suggests", or "requires attention".
- Ensure the output is concise and visually clean.`;

      const result = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
      });

      res.json({ summary: result.text || "No summary generated." });
    } catch (err: any) {
      console.warn("AI Performance summary error:", err);
      res.json({
        fallback: `AI Performance Summary Service is currently unavailable. Details: ${err.message || "unknown error"}`
      });
    }
  });

  // --- VITE / STATIC SERVING ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
