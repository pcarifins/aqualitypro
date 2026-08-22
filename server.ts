import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { store } from "./src/data/storageEngine";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // --- REST API ENDPOINTS ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "KRA Test Record", time: new Date().toISOString() });
  });

  app.get("/api/auth/google/config", (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || process.env.CLIENT_ID || "";
    res.json({ clientId });
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
