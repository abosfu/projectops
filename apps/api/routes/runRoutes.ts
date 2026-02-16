import express from "express";
import * as runFileService from "../services/runFileService.js";

export function createRunRoutes(): express.Router {
  const router = express.Router();

  /**
   * GET /runs - List all runs with metadata (newest first)
   */
  router.get("/", async (req, res) => {
    try {
      const runIds = await runFileService.listRunIds();
      
      // Fetch manifest for each run to get enriched metadata
      const runs = await Promise.all(
        runIds.map(async (runId) => {
          try {
            const manifest = await runFileService.readManifest(runId);
            return {
              runId: manifest.runId,
              runLabel: manifest.runLabel || `Weekly Snapshot — ${new Date(manifest.createdAt).toLocaleDateString()}`,
              createdAt: manifest.createdAt,
              sourceType: manifest.sourceType || "cli",
            };
          } catch (err) {
            // If manifest read fails, return basic info
            return {
              runId,
              runLabel: `Weekly Snapshot — ${runId}`,
              createdAt: new Date().toISOString(),
              sourceType: "cli" as const,
            };
          }
        })
      );
      
      res.json(runs);
    } catch (error) {
      console.error("Error reading runs directory:", error);
      res.status(500).json({ error: "Failed to read runs directory" });
    }
  });

  /**
   * GET /runs/:runId/manifest
   */
  router.get("/:runId/manifest", async (req, res) => {
    try {
      const { runId } = req.params;
      const manifest = await runFileService.readManifest(runId);
      res.json(manifest);
    } catch (error) {
      console.error("Error reading manifest:", error);
      res.status(404).json({ error: "Manifest not found" });
    }
  });

  /**
   * GET /runs/:runId/validation
   */
  router.get("/:runId/validation", async (req, res) => {
    try {
      const { runId } = req.params;
      const validation = await runFileService.readValidation(runId);
      res.json(validation);
    } catch (error) {
      console.error("Error reading validation report:", error);
      res.status(404).json({ error: "Validation report not found" });
    }
  });

  /**
   * GET /runs/:runId/signals
   */
  router.get("/:runId/signals", async (req, res) => {
    try {
      const { runId } = req.params;
      const signals = await runFileService.readSignals(runId);
      res.json(signals);
    } catch (error) {
      console.error("Error reading signals:", error);
      res.status(404).json({ error: "Signals not found" });
    }
  });

  /**
   * GET /runs/:runId/normalized
   */
  router.get("/:runId/normalized", async (req, res) => {
    try {
      const { runId } = req.params;
      const normalized = await runFileService.readNormalized(runId);
      res.json(normalized);
    } catch (error) {
      console.error("Error reading normalized data:", error);
      res.status(404).json({ error: "Normalized data not found" });
    }
  });

  /**
   * GET /runs/:runId/report-path
   */
  router.get("/:runId/report-path", async (req, res) => {
    try {
      const { runId } = req.params;
      const reportPath = await runFileService.getReportPath(runId);
      res.json({ path: reportPath });
    } catch (error) {
      console.error("Error checking report path:", error);
      res.status(404).json({ error: "Report not found" });
    }
  });

  return router;
}

