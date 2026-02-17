import express from "express";
import { writeFileSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";
import { ingestCSV } from "../../../packages/core/src/ingest.js";
import { generateDemoRun, DEFAULT_DEMO_SEED, hashSeedToNumber } from "../../../scripts/generate_demo_run.js";

const router = express.Router();

/**
 * POST /api/demo-run - Generate and ingest a demo run
 */
router.post("/", async (req, res) => {
  try {
    // Get optional seed from query or body, default to "projectops-demo" for determinism
    // Accept string seed and hash it to a number
    const seedInput = req.query.seed 
      ? String(req.query.seed)
      : req.body?.seed 
      ? String(req.body.seed)
      : DEFAULT_DEMO_SEED;
    
    const seed = hashSeedToNumber(seedInput);

    // Generate demo CSV (pass string seed, function will hash it)
    const csvContent = generateDemoRun(seedInput);

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
      // Store seed string for provenance (use the input seed, not the hashed number)
      // Process the generated CSV using existing ingestion pipeline
      const result = ingestCSV(tempFilePath, {
        runLabel: "Weekly Snapshot — Demo",
        sourceType: "demo",
        seed: seed,
        seedString: seedInput,
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
        seedString: seedInput,
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

