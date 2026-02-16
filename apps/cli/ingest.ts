#!/usr/bin/env node

import { ingestCSV } from "../../packages/core/src/ingest.js";
import { resolve } from "path";
import { pathToFileURL } from "url";

const inputFile = process.argv[2];

if (!inputFile) {
  console.error("Usage: npm run ingest -- <path-to-csv-file>");
  process.exit(1);
}

try {
  const inputPath = resolve(inputFile);
  console.log(`\n📥 Ingesting: ${inputPath}\n`);

  // Extract filename from path
  const filename = inputFile.split(/[/\\]/).pop() || "unknown.csv";
  const runLabel = `Weekly Snapshot — ${filename}`;

  const result = ingestCSV(inputPath, {
    runLabel,
    sourceType: "cli",
    sourceFilename: filename,
  });

  // Print CLI summary
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 INGESTION SUMMARY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Rows read:        ${result.totalRows}`);
  console.log(`Valid rows:       ${result.validRows}`);
  console.log(`Invalid rows:     ${result.invalidRows}`);
  console.log(`Output folder:    ${result.runFolder}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Print signals summary
  if (result.signals) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🚨 PROJECT SIGNALS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Total Tasks:              ${result.signals.totals.tasks}`);
    console.log(`Schedule Lag:            ${result.signals.totals.scheduleLagCount}`);
    console.log(`Critical Path Risk:      ${result.signals.totals.criticalPathRiskCount}`);
    console.log(`Budget Overburn:         ${result.signals.totals.budgetOverburnCount}`);
    console.log(`Projected Overrun:       ${result.signals.totals.projectedOverrunCount}`);

    if (result.signals.topBottlenecksBySubcontractor.length > 0) {
      console.log("\n🔥 Top 3 Bottlenecks by Subcontractor:");
      const top3 = result.signals.topBottlenecksBySubcontractor.slice(0, 3);
      top3.forEach((bottleneck, index) => {
        console.log(
          `  ${index + 1}. ${bottleneck.subcontractor} (score: ${bottleneck.score}) - ${bottleneck.blocked} blocked, ${bottleneck.scheduleLag} lag, ${bottleneck.budgetOverburn} overburn`
        );
      });
    }

    if (result.signals.topBottlenecksByTrade.length > 0) {
      console.log("\n🔥 Top 3 Bottlenecks by Trade:");
      const top3 = result.signals.topBottlenecksByTrade.slice(0, 3);
      top3.forEach((bottleneck, index) => {
        console.log(
          `  ${index + 1}. ${bottleneck.trade} (score: ${bottleneck.score}) - ${bottleneck.blocked} blocked, ${bottleneck.scheduleLag} lag, ${bottleneck.budgetOverburn} overburn`
        );
      });
    }
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  }

  // Print report path
  if (result.reportPath) {
    const reportUrl = pathToFileURL(result.reportPath).href;
    console.log(`Open report: ${reportUrl}\n`);
  }

  if (result.invalidRows > 0) {
    console.log(
      `⚠️  ${result.invalidRows} row(s) were rejected. Check validation_report.json for details.\n`
    );
  }

  if (result.validRows > 0) {
    const warningsCount = result.normalized.reduce(
      (sum, task) => sum + task.warnings.length,
      0
    );
    if (warningsCount > 0) {
      console.log(
        `⚠️  ${warningsCount} warning(s) generated. Check validation_report.json for summary.\n`
      );
    }
  }

  console.log("✅ Ingestion complete!\n");
} catch (error) {
  console.error("\n❌ Ingestion failed:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
