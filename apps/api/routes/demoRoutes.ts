import express from "express";
import { writeFileSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";
import { ingestCSV } from "../../../packages/core/src/ingest.js";
import { generateDemoRun, DEFAULT_DEMO_SEED } from "../../../scripts/generate_demo_run.js";

const router = express.Router();

/**
 * POST /api/demo-run - Generate and ingest a demo run
 */
router.post("/", async (req, res) => {
  try {
    // Get optional seed from query or body, default to 42 for determinism
    const seed = req.query.seed 
      ? parseInt(req.query.seed as string, 10)
      : req.body?.seed 
      ? parseInt(req.body.seed, 10)
      : DEFAULT_DEMO_SEED;

    // Generate demo CSV
    const csvContent = generateDemoRun(seed);

    // Write to temp file
    const tmpDir = join(process.cwd(), "tmp");
    try {
      mkdirSync(tmpDir, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }
    const tempFilePath = join(tmpDir, `demo_${Date.now()}.csv`);
    writeFileSync(tempFilePath, csvContent, "utf-8");

    try {
      // Process the generated CSV using existing ingestion pipeline
      const result = ingestCSV(tempFilePath, {
        runLabel: "Weekly Snapshot — ProjectOps Demo",
        sourceType: "demo",
        seed: seed,
        inputRowCount: csvContent.split("\n").length - 1, // Subtract header
      });

      // Clean up temp file
      try {
        unlinkSync(tempFilePath);
      } catch (err) {
        console.warn("Failed to delete temp file:", err);
      }

      // Return runId for UI to auto-select
      res.json({
        runId: result.signals.runId,
        totalRows: result.totalRows,
        validRows: result.validRows,
        invalidRows: result.invalidRows,
        seed: seed,
      });
    } catch (error) {
      // Clean up temp file on error
      try {
        unlinkSync(tempFilePath);
      } catch (err) {
        console.warn("Failed to delete temp file:", err);
      }

      throw error;
    }
  } catch (error) {
    console.error("Demo run generation error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to generate demo run",
    });
  }
});

export function createDemoRoutes(): express.Router {
  return router;
}

