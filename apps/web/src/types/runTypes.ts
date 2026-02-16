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

export interface ProjectSignals {
  runId: string;
  generatedAt: string;
  totals: {
    tasks: number;
    scheduleLagCount: number;
    criticalPathRiskCount: number;
    budgetOverburnCount: number;
    projectedOverrunCount: number;
  };
  byStatus: Record<string, number>;
  byProject: Record<string, number>;
  byTrade: Record<string, number>;
  bySubcontractor: Record<string, number>;
  topBottlenecksBySubcontractor: Array<{
    subcontractor: string;
    blocked: number;
    scheduleLag: number;
    budgetOverburn: number;
    score: number;
  }>;
  topBottlenecksByTrade: Array<{
    trade: string;
    blocked: number;
    scheduleLag: number;
    budgetOverburn: number;
    score: number;
  }>;
  perProjectRiskSummary: Array<{
    projectId: string;
    totalTasks: number;
    scheduleLagCount: number;
    criticalPathRiskCount: number;
    budgetOverburnCount: number;
    projectedOverrunPct: number;
    totalBudgetAllocated: number;
    totalBudgetSpent: number;
    healthScore: number;
  }>;
  globalHealthScore: number;
}

/**
 * Run summary from /api/runs endpoint
 */
export interface RunSummary {
  runId: string;
  runLabel: string;
  createdAt: string;
  sourceType: "upload" | "demo" | "cli";
}

/**
 * Run metadata for dropdown display
 */
export interface RunMetadata {
  runId: string;
  label: string;
  manifest: Manifest;
  signals: ProjectSignals | null;
}
