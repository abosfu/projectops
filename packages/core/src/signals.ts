import { TaskNormalized } from "./schema.js";
import { SIGNAL_THRESHOLDS } from "./config.js";

/**
 * Construction risk signals output structure
 */
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
 * Calculate days between two dates
 */
function daysBetween(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  return diffMs / (1000 * 60 * 60 * 24);
}

/**
 * Calculate expected progress percentage based on planned dates and snapshot time
 * @param task The task to evaluate
 * @param snapshotTime The time of the snapshot (run createdAt)
 * @returns Expected progress percentage (0-100)
 */
function calculateExpectedProgressPct(
  task: TaskNormalized,
  snapshotTime: Date
): number {
  const plannedStart = new Date(task.plannedStart);
  const plannedEnd = new Date(task.plannedEnd);
  const totalDuration = daysBetween(plannedStart, plannedEnd);

  if (totalDuration <= 0) {
    return 100; // Task should be done if start == end
  }

  // If snapshot is before planned start, expected progress is 0
  if (snapshotTime < plannedStart) {
    return 0;
  }

  // If snapshot is after planned end, expected progress is 100
  if (snapshotTime > plannedEnd) {
    return 100;
  }

  // Calculate expected progress based on elapsed time
  const elapsed = daysBetween(plannedStart, snapshotTime);
  const expectedPct = (elapsed / totalDuration) * 100;

  return Math.max(0, Math.min(100, expectedPct));
}

/**
 * Check if task has schedule lag using standardized logic
 * Task is behind schedule if (expectedProgressPct - actualProgressPct) >= threshold
 * @param task The task to evaluate
 * @param snapshotTime The time of the snapshot (run createdAt)
 * @returns true if task is behind schedule
 */
function hasScheduleLag(task: TaskNormalized, snapshotTime: Date): boolean {
  // If task is done, it's not behind schedule
  if (task.status === "done") {
    return false;
  }

  const expectedProgressPct = calculateExpectedProgressPct(task, snapshotTime);
  const actualProgressPct = task.progressPct;

  // Task is behind schedule if expected progress exceeds actual by threshold
  const progressGap = expectedProgressPct - actualProgressPct;
  return progressGap >= SIGNAL_THRESHOLDS.BEHIND_SCHEDULE_THRESHOLD_PCT;
}

/**
 * Check if task is on critical path risk (blocked or high dependency risk)
 * @param task The task to evaluate
 * @param allTasks All tasks in the project
 * @param snapshotTime The time of the snapshot (run createdAt)
 * @returns true if task is on critical path risk
 */
function isCriticalPathRisk(
  task: TaskNormalized,
  allTasks: TaskNormalized[],
  snapshotTime: Date
): boolean {
  // Blocked tasks are critical path risks
  if (task.status === "blocked") {
    return true;
  }

  // Check if dependency chain has issues
  if (task.dependsOnTaskId) {
    const dependency = allTasks.find((t) => t.taskId === task.dependsOnTaskId);
    if (dependency) {
      // If dependency is blocked or behind schedule, this task is at risk
      if (
        dependency.status === "blocked" ||
        hasScheduleLag(dependency, snapshotTime)
      ) {
        return true;
      }

      // Check downstream chain (up to threshold)
      let currentTask = dependency;
      let depth = 1;
      while (
        currentTask.dependsOnTaskId &&
        depth < SIGNAL_THRESHOLDS.CRITICAL_PATH_DOWNSTREAM_THRESHOLD
      ) {
        const upstreamTask = allTasks.find(
          (t) => t.taskId === currentTask.dependsOnTaskId
        );
        if (!upstreamTask) break;

        if (
          upstreamTask.status === "blocked" ||
          hasScheduleLag(upstreamTask, snapshotTime)
        ) {
          return true;
        }

        currentTask = upstreamTask;
        depth++;
      }
    }
  }

  return false;
}

/**
 * Check if task has budget overburn
 * Task is overburn if: budgetSpent > budgetAllocated * (progressPct/100) + epsilon
 * This accounts for expected spending based on progress
 * @param task The task to evaluate
 * @returns true if task has budget overburn
 */
function hasBudgetOverburn(task: TaskNormalized): boolean {
  if (task.budgetAllocated === 0) {
    return false;
  }

  // Expected spend based on progress
  const expectedSpend = task.budgetAllocated * (task.progressPct / 100);
  const overburnThreshold = expectedSpend + SIGNAL_THRESHOLDS.OVERBURN_EPSILON;

  return task.budgetSpent > overburnThreshold;
}

/**
 * Calculate projected overrun percentage
 */
function calculateProjectedOverrun(task: TaskNormalized): number {
  if (task.budgetAllocated === 0) return 0;
  
  const currentSpendRate = task.progressPct > 0 
    ? task.budgetSpent / task.progressPct 
    : 0;
  
  const projectedTotal = currentSpendRate * 100;
  const overrunPct = ((projectedTotal - task.budgetAllocated) / task.budgetAllocated) * 100;
  
  return Math.max(0, overrunPct);
}

/**
 * Calculate health score for a project (0-100)
 * Starts at 100, subtracts based on:
 * - 3 points per behind-schedule task (capped at 10 tasks = -30)
 * - 5 points per critical-path risk task (capped at 5 tasks = -25)
 * - 4 points per overburn task (capped at 6 tasks = -24)
 * - Projected overrun %: -10 if >10%, -20 if >20%
 */
function calculateHealthScore(
  scheduleLagCount: number,
  criticalPathRiskCount: number,
  budgetOverburnCount: number,
  projectedOverrunPct: number
): number {
  let score = 100;

  // Behind-schedule: -3 per task, capped at 10 tasks (max -30)
  const scheduleLagDeduction = Math.min(scheduleLagCount, 10) * 3;
  score -= scheduleLagDeduction;

  // Critical-path risk: -5 per task, capped at 5 tasks (max -25)
  const criticalPathDeduction = Math.min(criticalPathRiskCount, 5) * 5;
  score -= criticalPathDeduction;

  // Overburn: -4 per task, capped at 6 tasks (max -24)
  const overburnDeduction = Math.min(budgetOverburnCount, 6) * 4;
  score -= overburnDeduction;

  // Projected overrun %: -10 if >10%, -20 if >20%
  if (projectedOverrunPct > 20) {
    score -= 20;
  } else if (projectedOverrunPct > 10) {
    score -= 10;
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Compute construction project signals from normalized tasks
 * @param tasks Normalized task data
 * @param runId Unique run identifier
 * @param snapshotTime Optional snapshot time (defaults to now, but should use run createdAt)
 */
export function computeSignals(
  tasks: TaskNormalized[],
  runId: string,
  snapshotTime?: Date
): ProjectSignals {
  const snapshot = snapshotTime || new Date();

  // Count totals
  const totals = {
    tasks: tasks.length,
    scheduleLagCount: 0,
    criticalPathRiskCount: 0,
    budgetOverburnCount: 0,
    projectedOverrunCount: 0,
  };

  // Count by status
  const byStatus: Record<string, number> = {};
  tasks.forEach((task) => {
    byStatus[task.status] = (byStatus[task.status] || 0) + 1;
  });

  // Count by project
  const byProject: Record<string, number> = {};
  tasks.forEach((task) => {
    byProject[task.projectId] = (byProject[task.projectId] || 0) + 1;
  });

  // Count by trade
  const byTrade: Record<string, number> = {};
  tasks.forEach((task) => {
    byTrade[task.trade] = (byTrade[task.trade] || 0) + 1;
  });

  // Count by subcontractor
  const bySubcontractor: Record<string, number> = {};
  tasks.forEach((task) => {
    bySubcontractor[task.subcontractor] = (bySubcontractor[task.subcontractor] || 0) + 1;
  });

  // Analyze each task
  tasks.forEach((task) => {
    if (hasScheduleLag(task, snapshot)) {
      totals.scheduleLagCount++;
    }
    if (isCriticalPathRisk(task, tasks, snapshot)) {
      totals.criticalPathRiskCount++;
    }
    if (hasBudgetOverburn(task)) {
      totals.budgetOverburnCount++;
    }
    const overrunPct = calculateProjectedOverrun(task);
    if (overrunPct > 10) { // >10% projected overrun
      totals.projectedOverrunCount++;
    }
  });

  // Compute bottlenecks by subcontractor
  const subcontractorStats: Record<
    string,
    { blocked: number; scheduleLag: number; budgetOverburn: number }
  > = {};

  tasks.forEach((task) => {
    const sub = task.subcontractor;
    if (!subcontractorStats[sub]) {
      subcontractorStats[sub] = { blocked: 0, scheduleLag: 0, budgetOverburn: 0 };
    }

    if (task.status === "blocked") {
      subcontractorStats[sub].blocked++;
    }
    if (hasScheduleLag(task, snapshot)) {
      subcontractorStats[sub].scheduleLag++;
    }
    if (hasBudgetOverburn(task)) {
      subcontractorStats[sub].budgetOverburn++;
    }
  });

  const topBottlenecksBySubcontractor = Object.entries(subcontractorStats)
    .map(([subcontractor, stats]) => ({
      subcontractor,
      blocked: stats.blocked,
      scheduleLag: stats.scheduleLag,
      budgetOverburn: stats.budgetOverburn,
      score: stats.blocked + stats.scheduleLag + stats.budgetOverburn,
    }))
    .sort((a, b) => b.score - a.score);

  // Compute bottlenecks by trade
  const tradeStats: Record<
    string,
    { blocked: number; scheduleLag: number; budgetOverburn: number }
  > = {};

  tasks.forEach((task) => {
    const trade = task.trade;
    if (!tradeStats[trade]) {
      tradeStats[trade] = { blocked: 0, scheduleLag: 0, budgetOverburn: 0 };
    }

    if (task.status === "blocked") {
      tradeStats[trade].blocked++;
    }
    if (hasScheduleLag(task, snapshot)) {
      tradeStats[trade].scheduleLag++;
    }
    if (hasBudgetOverburn(task)) {
      tradeStats[trade].budgetOverburn++;
    }
  });

  const topBottlenecksByTrade = Object.entries(tradeStats)
    .map(([trade, stats]) => ({
      trade,
      blocked: stats.blocked,
      scheduleLag: stats.scheduleLag,
      budgetOverburn: stats.budgetOverburn,
      score: stats.blocked + stats.scheduleLag + stats.budgetOverburn,
    }))
    .sort((a, b) => b.score - a.score);

  // Compute per-project risk summary
  const projectStats: Record<
    string,
    {
      totalTasks: number;
      scheduleLagCount: number;
      criticalPathRiskCount: number;
      budgetOverburnCount: number;
      totalBudgetAllocated: number;
      totalBudgetSpent: number;
    }
  > = {};

  tasks.forEach((task) => {
    const projectId = task.projectId;
    if (!projectStats[projectId]) {
      projectStats[projectId] = {
        totalTasks: 0,
        scheduleLagCount: 0,
        criticalPathRiskCount: 0,
        budgetOverburnCount: 0,
        totalBudgetAllocated: 0,
        totalBudgetSpent: 0,
      };
    }

    projectStats[projectId].totalTasks++;
    if (hasScheduleLag(task, snapshot)) {
      projectStats[projectId].scheduleLagCount++;
    }
    if (isCriticalPathRisk(task, tasks, snapshot)) {
      projectStats[projectId].criticalPathRiskCount++;
    }
    if (hasBudgetOverburn(task)) {
      projectStats[projectId].budgetOverburnCount++;
    }
    projectStats[projectId].totalBudgetAllocated += task.budgetAllocated;
    projectStats[projectId].totalBudgetSpent += task.budgetSpent;
  });

  const perProjectRiskSummary = Object.entries(projectStats).map(
    ([projectId, stats]) => {
      const projectedOverrunPct =
        stats.totalBudgetAllocated > 0
          ? ((stats.totalBudgetSpent - stats.totalBudgetAllocated) /
              stats.totalBudgetAllocated) *
            100
          : 0;

      const healthScore = calculateHealthScore(
        stats.scheduleLagCount,
        stats.criticalPathRiskCount,
        stats.budgetOverburnCount,
        Math.max(0, projectedOverrunPct)
      );

      return {
        projectId,
        totalTasks: stats.totalTasks,
        scheduleLagCount: stats.scheduleLagCount,
        criticalPathRiskCount: stats.criticalPathRiskCount,
        budgetOverburnCount: stats.budgetOverburnCount,
        projectedOverrunPct: Math.max(0, projectedOverrunPct),
        totalBudgetAllocated: stats.totalBudgetAllocated,
        totalBudgetSpent: stats.totalBudgetSpent,
        healthScore,
      };
    }
  );

  // Calculate global health score (weighted average by project size, or simple average)
  // Using simple average for now
  const globalHealthScore =
    perProjectRiskSummary.length > 0
      ? Math.round(
          perProjectRiskSummary.reduce((sum, p) => sum + p.healthScore, 0) /
            perProjectRiskSummary.length
        )
      : 100;

  return {
    runId,
    generatedAt: snapshot.toISOString(),
    totals,
    byStatus,
    byProject,
    byTrade,
    bySubcontractor,
    topBottlenecksBySubcontractor,
    topBottlenecksByTrade,
    perProjectRiskSummary,
    globalHealthScore,
  };
}
