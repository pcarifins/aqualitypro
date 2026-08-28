import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { store } from "./src/data/storageEngine";
import { syncSharePointPPC } from "./server/sharepointPpcService";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // --- REST API ENDPOINTS ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "KRA Test Record", time: new Date().toISOString() });
  });

  // --- SHAREPOINT ENDPOINTS ---
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
      const result = await syncSharePointPPC(currentUser);
      res.json(result);
    } catch (err: any) {
      console.error("SharePoint sync failed:", err);
      res.status(500).json({ error: err.message || "Unknown error" });
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
