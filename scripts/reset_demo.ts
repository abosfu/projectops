#!/usr/bin/env node

import { readdir, rm, readFile } from "fs/promises";
import { join } from "path";
import { ingestCSV } from "../packages/core/src/ingest.js";
import { generateDemoRun, DEFAULT_DEMO_SEED, hashSeedToNumber } from "./generate_demo_run.js";
import { writeFileSync, mkdirSync, unlinkSync } from "fs";

const RUNS_DIR = join(process.cwd(), "runs");
const TMP_DIR = join(process.cwd(), "tmp");

async function main() {
  try {
    console.log("Resetting demo data...\n");

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
          console.log(`  ✓ Deleted: ${runId}`);
        } catch (err) {
          console.error(`  ✗ Failed to delete ${runId}:`, err);
        }
      }
    } else {
      console.log("No demo runs to delete.");
    }

    // Generate fresh demo run using the same method as the API
    console.log(`\nGenerating fresh demo snapshot (seed: ${DEFAULT_DEMO_SEED})...`);
    
    // Generate demo CSV
    const csvContent = generateDemoRun(DEFAULT_DEMO_SEED);

    // Write to temp file
    try {
      mkdirSync(TMP_DIR, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }
    const tempFilePath = join(TMP_DIR, `demo_reset_${Date.now()}.csv`);
    writeFileSync(tempFilePath, csvContent, "utf-8");

    try {
      // Ingest the generated CSV
      const seedNumber = hashSeedToNumber(DEFAULT_DEMO_SEED);
      const result = ingestCSV(tempFilePath, {
        runLabel: "Weekly Snapshot — Demo",
        sourceType: "demo",
        seed: seedNumber,
        seedString: DEFAULT_DEMO_SEED,
        inputRowCount: csvContent.split("\n").length - 1, // Subtract header
      });

      // Clean up temp file
      try {
        unlinkSync(tempFilePath);
      } catch (err) {
        console.warn("Failed to delete temp file:", err);
      }

      console.log(`\n✅ Reset complete!`);
      console.log(`   Run ID: ${result.signals.runId}`);
      console.log(`   Total tasks: ${result.validRows}`);
      console.log(`   Seed: ${DEFAULT_DEMO_SEED}`);
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
    console.error("\n❌ Reset error:", error);
    process.exit(1);
  }
}

main();
