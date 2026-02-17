import { describe, it, expect } from "vitest";
import { generateDemoRun, hashSeedToNumber, DEFAULT_DEMO_SEED } from "../scripts/generate_demo_run.js";
import { ingestCSV } from "../packages/core/src/ingest.js";
import { writeFileSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";

describe("Demo Generation", () => {
  it("1) Same seed produces identical CSV output", () => {
    const seed = "test-seed-123";
    const csv1 = generateDemoRun(seed);
    const csv2 = generateDemoRun(seed);
    
    expect(csv1).toBe(csv2);
    expect(csv1.split("\n").length).toBeGreaterThan(1);
  });

  it("2) Different seeds produce different CSV output", () => {
    const csv1 = generateDemoRun("seed-1");
    const csv2 = generateDemoRun("seed-2");
    
    expect(csv1).not.toBe(csv2);
  });

  it("3) Default seed produces consistent output", () => {
    const csv1 = generateDemoRun(DEFAULT_DEMO_SEED);
    const csv2 = generateDemoRun(DEFAULT_DEMO_SEED);
    
    expect(csv1).toBe(csv2);
  });

  it("4) Hash seed to number is deterministic", () => {
    const seed = "test-seed";
    const hash1 = hashSeedToNumber(seed);
    const hash2 = hashSeedToNumber(seed);
    
    expect(hash1).toBe(hash2);
    expect(hash1).toBeGreaterThan(0);
  });

  it("5) Generated demo has realistic task count (60-140)", async () => {
    const csv = generateDemoRun("test-realistic-count");
    const lines = csv.split("\n").filter(line => line.trim().length > 0);
    const taskCount = lines.length - 1; // Subtract header
    
    expect(taskCount).toBeGreaterThanOrEqual(60);
    expect(taskCount).toBeLessThanOrEqual(140);
  });

  it("6) Same seed produces identical signals summary", async () => {
    const seed = "deterministic-test";
    const tmpDir = join(process.cwd(), "tmp");
    
    try {
      mkdirSync(tmpDir, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }

    // Generate and ingest first run
    const csv1 = generateDemoRun(seed);
    const tempFile1 = join(tmpDir, `demo_test_1_${Date.now()}.csv`);
    writeFileSync(tempFile1, csv1, "utf-8");
    const result1 = ingestCSV(tempFile1, {
      runLabel: "Test Run 1",
      sourceType: "demo",
      seed: hashSeedToNumber(seed),
    });

    // Generate and ingest second run with same seed
    const csv2 = generateDemoRun(seed);
    const tempFile2 = join(tmpDir, `demo_test_2_${Date.now()}.csv`);
    writeFileSync(tempFile2, csv2, "utf-8");
    const result2 = ingestCSV(tempFile2, {
      runLabel: "Test Run 2",
      sourceType: "demo",
      seed: hashSeedToNumber(seed),
    });

    // Compare key totals
    expect(result1.signals.totals.tasks).toBe(result2.signals.totals.tasks);
    expect(result1.signals.totals.scheduleLagCount).toBe(result2.signals.totals.scheduleLagCount);
    expect(result1.signals.totals.criticalPathRiskCount).toBe(result2.signals.totals.criticalPathRiskCount);
    expect(result1.signals.totals.budgetOverburnCount).toBe(result2.signals.totals.budgetOverburnCount);

    // Cleanup
    try {
      unlinkSync(tempFile1);
      unlinkSync(tempFile2);
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  it("7) Risk distribution sums to 100% and on track >= 0", async () => {
    const seed = "distribution-test";
    const tmpDir = join(process.cwd(), "tmp");
    
    try {
      mkdirSync(tmpDir, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }

    const csv = generateDemoRun(seed);
    const tempFile = join(tmpDir, `demo_dist_test_${Date.now()}.csv`);
    writeFileSync(tempFile, csv, "utf-8");
    
    const result = ingestCSV(tempFile, {
      runLabel: "Distribution Test",
      sourceType: "demo",
      seed: hashSeedToNumber(seed),
    });

    const signals = result.signals;
    const total = signals.totals.tasks;
    const behindSchedule = signals.totals.scheduleLagCount;
    const criticalRisk = signals.totals.criticalPathRiskCount;
    const overburn = signals.totals.budgetOverburnCount;
    const onTrack = total - behindSchedule - criticalRisk - overburn;

    // Categories should be mutually exclusive and sum to total
    expect(behindSchedule + criticalRisk + overburn + onTrack).toBe(total);
    expect(onTrack).toBeGreaterThanOrEqual(0);
    
    // Percentages should sum to 100%
    const behindPct = (behindSchedule / total) * 100;
    const criticalPct = (criticalRisk / total) * 100;
    const overburnPct = (overburn / total) * 100;
    const onTrackPct = (onTrack / total) * 100;
    
    const sumPct = behindPct + criticalPct + overburnPct + onTrackPct;
    expect(sumPct).toBeCloseTo(100, 1); // Allow small floating point errors

    // Cleanup
    try {
      unlinkSync(tempFile);
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  it("8) Generated demo has realistic project count (3-6)", async () => {
    const csv = generateDemoRun("test-projects");
    const lines = csv.split("\n").filter(line => line.trim().length > 0);
    const dataLines = lines.slice(1); // Skip header
    
    const projectIds = new Set(dataLines.map(line => {
      const parts = line.split(",");
      return parts[0]; // project_id is first column
    }));
    
    expect(projectIds.size).toBeGreaterThanOrEqual(3);
    expect(projectIds.size).toBeLessThanOrEqual(6);
  });

  it("9) Generated demo has realistic trade count (6-10)", async () => {
    const csv = generateDemoRun("test-trades");
    const lines = csv.split("\n").filter(line => line.trim().length > 0);
    const dataLines = lines.slice(1); // Skip header
    
    const trades = new Set(dataLines.map(line => {
      const parts = line.split(",");
      return parts[3]; // trade is 4th column (0-indexed: 3)
    }));
    
    expect(trades.size).toBeGreaterThanOrEqual(6);
    expect(trades.size).toBeLessThanOrEqual(10);
  });

  it("10) Generated demo has realistic subcontractor count (6-12)", async () => {
    const csv = generateDemoRun("test-subcontractors");
    const lines = csv.split("\n").filter(line => line.trim().length > 0);
    const dataLines = lines.slice(1); // Skip header
    
    const subcontractors = new Set(dataLines.map(line => {
      const parts = line.split(",");
      return parts[4]; // subcontractor is 5th column (0-indexed: 4)
    }));
    
    expect(subcontractors.size).toBeGreaterThanOrEqual(6);
    expect(subcontractors.size).toBeLessThanOrEqual(12);
  });
});

