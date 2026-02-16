#!/usr/bin/env node

import { readdir, stat, rm, readFile } from "fs/promises";
import { join } from "path";

const RUNS_DIR = join(process.cwd(), "runs");
const KEEP_LATEST = 10;

async function main() {
  try {
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

    // Filter to demo runs only
    const demoRuns = runInfo.filter((run) => run.sourceType === "demo");

    // Sort by creation time (newest first)
    demoRuns.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

    // Keep latest N, delete the rest
    const runsToDelete = demoRuns.slice(KEEP_LATEST);
    
    if (runsToDelete.length === 0) {
      console.log("No demo runs to clean up.");
      return;
    }

    console.log(`Keeping latest ${KEEP_LATEST} demo runs.`);
    console.log(`Deleting ${runsToDelete.length} older demo runs...`);

    for (const run of runsToDelete) {
      try {
        const runPath = join(RUNS_DIR, run.runId);
        await rm(runPath, { recursive: true, force: true });
        console.log(`  Deleted: ${run.runId}`);
      } catch (err) {
        console.error(`  Failed to delete ${run.runId}:`, err);
      }
    }

    console.log(`\n✅ Cleanup complete. ${demoRuns.length - runsToDelete.length} demo runs kept.`);
  } catch (error) {
    console.error("Cleanup error:", error);
    process.exit(1);
  }
}

main();

