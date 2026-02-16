import express from "express";
import { readdir, stat, rm } from "fs/promises";
import { join } from "path";
import { readFile } from "fs/promises";

const router = express.Router();

const RUNS_DIR = join(process.cwd(), "runs");

/**
 * POST /api/runs/cleanup - Clean up old runs
 * Body: { keepLatest: number, includeUploads: boolean }
 */
router.post("/", async (req, res) => {
  try {
    const keepLatest = req.body?.keepLatest || 10;
    const includeUploads = req.body?.includeUploads || false;

    if (!Number.isInteger(keepLatest) || keepLatest < 0) {
      return res.status(400).json({ error: "keepLatest must be a non-negative integer" });
    }

    // Get all run directories
    const entries = await readdir(RUNS_DIR, { withFileTypes: true });
    const runDirs = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    // Read manifests to determine source type and creation time
    const runInfo = await Promise.all(
      runDirs.map(async (runId) => {
        try {
          const manifestPath = join(RUNS_DIR, runId, "manifest.json");
          const manifestContent = await readFile(manifestPath, "utf-8");
          const manifest = JSON.parse(manifestContent);
          
          const stats = await stat(join(RUNS_DIR, runId));
          
          return {
            runId,
            sourceType: manifest.sourceType || "cli",
            createdAt: manifest.createdAt || stats.mtime.toISOString(),
            mtime: stats.mtime,
          };
        } catch (err) {
          // If manifest read fails, treat as CLI and use directory mtime
          const stats = await stat(join(RUNS_DIR, runId));
          return {
            runId,
            sourceType: "cli" as const,
            createdAt: stats.mtime.toISOString(),
            mtime: stats.mtime,
          };
        }
      })
    );

    // Filter to demo runs (and optionally uploads)
    const runsToConsider = runInfo.filter(
      (run) => run.sourceType === "demo" || (includeUploads && run.sourceType === "upload")
    );

    // Sort by creation time (newest first)
    runsToConsider.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

    // Keep latest N, delete the rest
    const runsToDelete = runsToConsider.slice(keepLatest);
    const deletedRuns: string[] = [];
    const errors: string[] = [];

    for (const run of runsToDelete) {
      try {
        const runPath = join(RUNS_DIR, run.runId);
        await rm(runPath, { recursive: true, force: true });
        deletedRuns.push(run.runId);
      } catch (err) {
        errors.push(`${run.runId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    res.json({
      deleted: deletedRuns.length,
      deletedRuns,
      kept: runsToConsider.length - deletedRuns.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to cleanup runs",
    });
  }
});

export function createCleanupRoutes(): express.Router {
  return router;
}

