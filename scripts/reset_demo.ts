#!/usr/bin/env node

import { readdir, stat, rm, readFile } from "fs/promises";
import { join } from "path";
import { execSync } from "child_process";

const RUNS_DIR = join(process.cwd(), "runs");
const DEFAULT_SEED = 42;

async function main() {
  try {
    // Get all run directories
    const entries = await readdir(RUNS_DIR, { withFileTypes: true });
    const runDirs = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    // Read manifests to find demo runs
    const demoRuns: string[] = [];
    
    for (const runId of runDirs) {
      try {
        const manifestPath = join(RUNS_DIR, runId, "manifest.json");
        const manifestContent = await readFile(manifestPath, "utf-8");
        const manifest = JSON.parse(manifestContent);
        
        if (manifest.sourceType === "demo") {
          demoRuns.push(runId);
        }
      } catch (err) {
        // Skip if manifest can't be read
      }
    }

    // Delete all demo runs
    if (demoRuns.length > 0) {
      console.log(`Deleting ${demoRuns.length} demo runs...`);
      for (const runId of demoRuns) {
        try {
          const runPath = join(RUNS_DIR, runId);
          await rm(runPath, { recursive: true, force: true });
          console.log(`  Deleted: ${runId}`);
        } catch (err) {
          console.error(`  Failed to delete ${runId}:`, err);
        }
      }
    }

    // Regenerate baseline demo run with seed 42
    console.log(`\nGenerating baseline demo run (seed ${DEFAULT_SEED})...`);
    execSync(`npm run gen:sample -- --seed ${DEFAULT_SEED} --projects 3 --tasks 25`, {
      stdio: "inherit",
      cwd: process.cwd(),
    });

    // Ingest the generated CSV
    const generatedFile = join(
      process.cwd(),
      "data",
      "generated_inputs",
      `projectops_tasks_${DEFAULT_SEED}_3p_25t.csv`
    );
    
    console.log(`\nIngesting baseline demo run...`);
    execSync(`npm run ingest -- ${generatedFile}`, {
      stdio: "inherit",
      cwd: process.cwd(),
    });

    console.log(`\n✅ Reset complete. Baseline demo run generated with seed ${DEFAULT_SEED}.`);
  } catch (error) {
    console.error("Reset error:", error);
    process.exit(1);
  }
}

main();

