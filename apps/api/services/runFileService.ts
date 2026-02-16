import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const RUNS_DIR = join(process.cwd(), "runs");

/**
 * List all run IDs (newest first)
 */
export async function listRunIds(): Promise<string[]> {
  if (!existsSync(RUNS_DIR)) {
    return [];
  }

  const entries = await readdir(RUNS_DIR, { withFileTypes: true });
  const runIds = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse(); // Newest first

  return runIds;
}

/**
 * Read manifest.json for a run
 */
export async function readManifest(runId: string): Promise<any> {
  const manifestPath = join(RUNS_DIR, runId, "manifest.json");

  if (!existsSync(manifestPath)) {
    throw new Error("Manifest not found");
  }

  const content = await readFile(manifestPath, "utf-8");
  return JSON.parse(content);
}

/**
 * Read validation_report.json for a run
 */
export async function readValidation(runId: string): Promise<any> {
  const validationPath = join(RUNS_DIR, runId, "validation_report.json");

  if (!existsSync(validationPath)) {
    throw new Error("Validation report not found");
  }

  const content = await readFile(validationPath, "utf-8");
  return JSON.parse(content);
}

/**
 * Read project_signals.json for a run
 */
export async function readSignals(runId: string): Promise<any> {
  const signalsPath = join(RUNS_DIR, runId, "project_signals.json");

  if (!existsSync(signalsPath)) {
    throw new Error("Project signals not found");
  }

  const content = await readFile(signalsPath, "utf-8");
  return JSON.parse(content);
}

/**
 * Read normalized_tasks.json for a run
 */
export async function readNormalized(runId: string): Promise<any> {
  const normalizedPath = join(RUNS_DIR, runId, "normalized_tasks.json");

  if (!existsSync(normalizedPath)) {
    throw new Error("Normalized tasks not found");
  }

  const content = await readFile(normalizedPath, "utf-8");
  return JSON.parse(content);
}

/**
 * Get dashboard_report.html path for a run
 */
export async function getReportPath(runId: string): Promise<string> {
  const reportPath = join(RUNS_DIR, runId, "dashboard_report.html");

  if (!existsSync(reportPath)) {
    throw new Error("Report not found");
  }

  return reportPath;
}
