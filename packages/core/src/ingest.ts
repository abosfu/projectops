import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import Papa from "papaparse";
import { RawCSVRow, TaskNormalized, RowValidationResult } from "./schema.js";
import { normalizeRows } from "./normalize.js";
import { storeRunArtifacts } from "./storage.js";
import { computeSignals, ProjectSignals } from "./signals.js";
import { generateReport } from "./report.js";

/**
 * Ingestion result
 */
export interface IngestionResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  normalized: TaskNormalized[];
  validationResults: RowValidationResult[];
  runFolder: string;
  signals: ProjectSignals;
  reportPath: string;
}

/**
 * Source metadata for ingestion
 */
export interface IngestionSource {
  runLabel?: string;
  sourceType?: "upload" | "demo" | "cli";
  sourceFilename?: string;
  seed?: number | null;
  seedString?: string | null;
  inputRowCount?: number;
}

/**
 * Ingest CSV file and produce normalized output
 */
export function ingestCSV(
  inputFilePath: string,
  source?: IngestionSource
): IngestionResult {
  // Read CSV file
  const csvContent = readFileSync(inputFilePath, "utf-8");

  // Parse CSV
  const parseResult = Papa.parse<RawCSVRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => {
      // Normalize header names (handle spaces, case variations)
      return header.trim().toLowerCase().replace(/\s+/g, "_");
    },
  });

  if (parseResult.errors.length > 0) {
    throw new Error(
      `CSV parsing errors: ${parseResult.errors.map((e) => e.message).join(", ")}`
    );
  }

  const rows = parseResult.data;
  const totalRows = rows.length;

  // Normalize rows
  const { normalized, validationResults } = normalizeRows(rows);

  // Generate run ID (timestamp)
  const runId = new Date().toISOString().replace(/[:.]/g, "-");

  // Determine source metadata
  const runLabel = source?.runLabel || `Weekly Snapshot — ${new Date().toLocaleDateString()}`;
  const sourceType = source?.sourceType || "cli";
  const sourceFilename = source?.sourceFilename;
  const seed = source?.seed;
  const seedString = source?.seedString;
  const inputRowCount = source?.inputRowCount;

  // Store artifacts
  const runFolder = storeRunArtifacts(
    runId,
    inputFilePath,
    csvContent,
    normalized,
    validationResults,
    totalRows,
    runLabel,
    sourceType,
    sourceFilename,
    seed,
    seedString,
    inputRowCount
  );

  // Get snapshot time from manifest (run createdAt)
  // Read manifest to get createdAt timestamp for consistent signal computation
  const manifestPath = join(runFolder, "manifest.json");
  const manifestContent = readFileSync(manifestPath, "utf-8");
  const manifest = JSON.parse(manifestContent);
  const snapshotTime = new Date(manifest.createdAt);

  // Compute project signals using snapshot time
  const signals = computeSignals(normalized, runId, snapshotTime);

  // Write project_signals.json
  const signalsPath = join(runFolder, "project_signals.json");
  writeFileSync(signalsPath, JSON.stringify(signals, null, 2), "utf-8");

  // Generate HTML report
  const reportPath = generateReport(runFolder);

  return {
    totalRows,
    validRows: normalized.length,
    invalidRows: totalRows - normalized.length,
    normalized,
    validationResults,
    runFolder,
    signals,
    reportPath,
  };
}
