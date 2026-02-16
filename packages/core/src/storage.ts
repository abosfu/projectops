import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { TaskNormalized, RowValidationResult } from "./schema.js";

/**
 * Validation report structure
 */
export interface ValidationReport {
  rejectedRows: Array<{
    rowNumber: number;
    errors: string[];
  }>;
  warningsSummary: {
    missingTrade: number;
    missingSubcontractor: number;
    unknownStatusMapped: number;
    progressPctClamped: number;
    budgetSpentDefaulted: number;
  };
}

/**
 * Manifest structure
 */
export interface Manifest {
  runId: string;
  runLabel: string;
  sourceType: "upload" | "demo" | "cli";
  sourceFilename?: string;
  seed?: number | null;
  inputRowCount?: number;
  inputFile: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  schemaVersion: string;
  createdAt: string;
  generatedAt?: string;
}

/**
 * Create run folder and store artifacts
 */
export function storeRunArtifacts(
  runId: string,
  inputFilePath: string,
  rawCSVContent: string,
  normalized: TaskNormalized[],
  validationResults: RowValidationResult[],
  totalRows: number,
  runLabel: string,
  sourceType: "upload" | "demo" | "cli",
  sourceFilename?: string,
  seed?: number | null,
  inputRowCount?: number
): string {
  const runsDir = join(process.cwd(), "runs");
  const runDir = join(runsDir, runId);

  // Create directories
  mkdirSync(runDir, { recursive: true });

  // Copy raw CSV
  const rawCSVPath = join(runDir, "raw.csv");
  writeFileSync(rawCSVPath, rawCSVContent, "utf-8");

  // Write normalized JSON
  const normalizedPath = join(runDir, "normalized_tasks.json");
  writeFileSync(
    normalizedPath,
    JSON.stringify(normalized, null, 2),
    "utf-8"
  );

  // Build validation report
  const validationReport = buildValidationReport(validationResults);
  const validationReportPath = join(runDir, "validation_report.json");
  writeFileSync(
    validationReportPath,
    JSON.stringify(validationReport, null, 2),
    "utf-8"
  );

  // Build manifest
  const now = new Date();
  const manifest: Manifest = {
    runId,
    runLabel,
    sourceType,
    sourceFilename,
    seed: seed !== undefined ? seed : null,
    inputRowCount: inputRowCount !== undefined ? inputRowCount : totalRows,
    inputFile: inputFilePath,
    totalRows,
    validRows: normalized.length,
    invalidRows: totalRows - normalized.length,
    schemaVersion: "v1",
    createdAt: now.toISOString(),
    generatedAt: now.toISOString(),
  };
  const manifestPath = join(runDir, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  return runDir;
}

/**
 * Build validation report from validation results
 */
function buildValidationReport(
  validationResults: RowValidationResult[]
): ValidationReport {
  const rejectedRows: Array<{ rowNumber: number; errors: string[] }> = [];
  const warningsSummary = {
    missingTrade: 0,
    missingSubcontractor: 0,
    unknownStatusMapped: 0,
    progressPctClamped: 0,
    budgetSpentDefaulted: 0,
  };

  validationResults.forEach((result, index) => {
    if (!result.isValid) {
      rejectedRows.push({
        rowNumber: index + 1,
        errors: result.errors,
      });
    }

    // Count warnings
    result.warnings.forEach((warning) => {
      if (warning.includes("trade")) {
        warningsSummary.missingTrade++;
      } else if (warning.includes("subcontractor")) {
        warningsSummary.missingSubcontractor++;
      } else if (warning.includes("status")) {
        warningsSummary.unknownStatusMapped++;
      } else if (warning.includes("progress_pct") && (warning.includes("clamped") || warning.includes("above") || warning.includes("below"))) {
        warningsSummary.progressPctClamped++;
      } else if (warning.includes("budget_spent") && warning.includes("defaulting")) {
        warningsSummary.budgetSpentDefaulted++;
      }
    });
  });

  return {
    rejectedRows,
    warningsSummary,
  };
}
