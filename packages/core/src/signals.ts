import { TaskNormalized } from "./schema.js";
import { SIGNAL_THRESHOLDS } from "./config.js";
import {
  clamp,
  clampPercentage,
  safePercentage,
  calculateOnTrackPercentage,
  calculateProjectedOverrunPct,
  calculateHealthScore as calculateHealthScoreUtil,
  validateStatusCounts,
} from "./metricUtils.js";

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
 * Check if task is behind schedule (v1 simplified)
 * 
 * DEFINITION: A task is "behind schedule" if:
 * (expectedProgressPct - actualProgressPct) >= 10
 * 
 * expectedProgressPct is computed from planned_start/planned_end relative to snapshot time.
 * 
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
 * Check if task is on critical path risk (v1 simplified)
 * 
 * DEFINITION: A task is "critical risk" if:
 * a) status === "blocked"
 * OR
 * b) it depends_on_task_id and the direct dependency task is blocked OR behind schedule
 * 
 * Only direct dependency (no recursion).
 * If dependency is missing/invalid, do not mark critical risk from dependency.
 * 
 * This function should only be called for tasks that are NOT already behind schedule,
 * as categories are mutually exclusive (Behind Schedule > Critical Path Risk > Budget Overburn > On Track).
 * 
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
  // Don't count as critical path risk if already behind schedule
  // (This function should only be called for non-behind-schedule tasks)
  if (hasScheduleLag(task, snapshotTime)) {
    return false;
  }

  // Rule a: Blocked tasks are critical path risks
  if (task.status === "blocked") {
    return true;
  }

  // Rule b: Check direct dependency only (no recursion)
  if (task.dependsOnTaskId) {
    const dependency = allTasks.find((t) => t.taskId === task.dependsOnTaskId);
    if (dependency) {
      // If direct dependency is blocked or behind schedule, this task is at risk
      if (
        dependency.status === "blocked" ||
        hasScheduleLag(dependency, snapshotTime)
      ) {
        return true;
      }
    }
    // If dependency is missing/invalid, do not mark critical risk
  }

  return false;
}

/**
 * Check if task has budget overburn (v1 simplified)
 * 
 * DEFINITION: A task is "overburn" if budget_spent > budget_allocated (strict >).
 * 
 * @param task The task to evaluate
 * @returns true if task has budget overburn
 */
function hasBudgetOverburn(task: TaskNormalized): boolean {
  // Simple comparison: spent > allocated
  return task.budgetSpent > task.budgetAllocated;
}

/**
 * Calculate projected overrun percentage for a single task
 */
function calculateProjectedOverrun(task: TaskNormalized): number {
  if (task.budgetAllocated === 0 || !isFinite(task.budgetAllocated)) return 0;
  if (!isFinite(task.budgetSpent)) return 0;
  
  // Current overrun
  const currentOverrun = task.budgetSpent - task.budgetAllocated;
  if (currentOverrun > 0) {
    return clampPercentage((currentOverrun / task.budgetAllocated) * 100);
  }
  
  // Projected overrun based on spend rate
  if (task.progressPct > 0 && task.progressPct < 100) {
    const spendRate = task.budgetSpent / task.progressPct;
    const projectedTotal = spendRate * 100;
    const projectedOverrun = projectedTotal - task.budgetAllocated;
    if (projectedOverrun > 0) {
      return clampPercentage((projectedOverrun / task.budgetAllocated) * 100);
    }
  }
  
  return 0;
}

// Health score calculation is now done directly using calculateHealthScoreUtil
// This function is removed to avoid confusion

/**
 * Compute construction project signals from normalized tasks (v1 simplified)
 * 
 * METRIC DEFINITIONS (v1):
 * 
 * 1. Schedule Lag: A task is "behind schedule" if:
 *    (expectedProgressPct - actualProgressPct) >= 10
 *    expectedProgressPct is computed from planned_start/planned_end relative to snapshot time
 * 
 * 2. Critical Path Risk: A task is "critical risk" if (and only if not already behind schedule):
 *    a) status === "blocked"
 *    OR
 *    b) it depends_on_task_id and the direct dependency task is blocked OR behind schedule
 *    Only direct dependency (no recursion). If dependency is missing/invalid, do not mark critical risk.
 * 
 * 3. Budget Overburn: A task is "overburn" if (and only if not already behind schedule or critical):
 *    budget_spent > budget_allocated (strict >)
 * 
 * 4. On Track: Tasks that don't fall into any of the above categories
 * 
 * Categories are mutually exclusive and evaluated in priority order:
 * Behind Schedule > Critical Path Risk > Budget Overburn > On Track
 * 
 * Per-project risk summary uses the exact same predicates as totals.
 * 
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
  
  // Validate status counts sum to total tasks
  const validatedByStatus = validateStatusCounts(byStatus, totals.tasks);

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

  // Analyze each task with mutually exclusive categories:
  // A) Behind Schedule (highest priority)
  // B) Critical Path Risk (not behind schedule)
  // C) Budget Overburn (not behind schedule, not critical)
  // D) On Track (everything else)
  tasks.forEach((task) => {
    const behindSchedule = hasScheduleLag(task, snapshot);
    const criticalRisk = !behindSchedule && isCriticalPathRisk(task, tasks, snapshot);
    const overburn = !behindSchedule && !criticalRisk && hasBudgetOverburn(task);
    
    if (behindSchedule) {
      totals.scheduleLagCount++;
    } else if (criticalRisk) {
      totals.criticalPathRiskCount++;
    } else if (overburn) {
      totals.budgetOverburnCount++;
    }
    // On Track tasks are not counted separately (they're the remainder)
    
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
      blockedCount: number;
      totalBudgetAllocated: number;
      totalBudgetSpent: number;
      totalProgressPct: number;
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
        blockedCount: 0,
        totalBudgetAllocated: 0,
        totalBudgetSpent: 0,
        totalProgressPct: 0,
      };
    }

    projectStats[projectId].totalTasks++;
    // Use same mutually exclusive logic for per-project stats
    const behindSchedule = hasScheduleLag(task, snapshot);
    const criticalRisk = !behindSchedule && isCriticalPathRisk(task, tasks, snapshot);
    const overburn = !behindSchedule && !criticalRisk && hasBudgetOverburn(task);
    
    if (behindSchedule) {
      projectStats[projectId].scheduleLagCount++;
    } else if (criticalRisk) {
      projectStats[projectId].criticalPathRiskCount++;
    } else if (overburn) {
      projectStats[projectId].budgetOverburnCount++;
    }
    
    if (task.status === "blocked") {
      projectStats[projectId].blockedCount++;
    }
    
    projectStats[projectId].totalBudgetAllocated += task.budgetAllocated;
    projectStats[projectId].totalBudgetSpent += task.budgetSpent;
    projectStats[projectId].totalProgressPct += task.progressPct;
  });

  const perProjectRiskSummary = Object.entries(projectStats).map(
    ([projectId, stats]) => {
      // Calculate average progress for the project
      const avgProgressPct = stats.totalTasks > 0 
        ? stats.totalProgressPct / stats.totalTasks 
        : 0;

      // Calculate projected overrun using comprehensive method
      const projectedOverrunPct = calculateProjectedOverrunPct(
        stats.totalBudgetAllocated,
        stats.totalBudgetSpent,
        avgProgressPct,
        stats.budgetOverburnCount,
        stats.totalTasks
      );

      // Calculate health score with blocked tasks included
      const healthScore = calculateHealthScoreUtil(
        stats.scheduleLagCount,
        stats.criticalPathRiskCount,
        stats.budgetOverburnCount,
        stats.blockedCount,
        stats.totalTasks,
        projectedOverrunPct
      );

      return {
        projectId,
        totalTasks: stats.totalTasks,
        scheduleLagCount: stats.scheduleLagCount,
        criticalPathRiskCount: stats.criticalPathRiskCount,
        budgetOverburnCount: stats.budgetOverburnCount,
        projectedOverrunPct: clampPercentage(projectedOverrunPct),
        totalBudgetAllocated: stats.totalBudgetAllocated,
        totalBudgetSpent: stats.totalBudgetSpent,
        healthScore: clamp(healthScore, 0, 100),
      };
    }
  );

  // Calculate global health score (weighted average by project size)
  const globalHealthScore =
    perProjectRiskSummary.length > 0
      ? Math.round(
          perProjectRiskSummary.reduce((sum, p) => {
            const weight = p.totalTasks;
            return sum + (p.healthScore * weight);
          }, 0) / 
          perProjectRiskSummary.reduce((sum, p) => sum + p.totalTasks, 0)
        )
      : 100;

  return {
    runId,
    generatedAt: snapshot.toISOString(),
    totals,
    byStatus: validatedByStatus,
    byProject,
    byTrade,
    bySubcontractor,
    topBottlenecksBySubcontractor,
    topBottlenecksByTrade,
    perProjectRiskSummary,
    globalHealthScore: clamp(globalHealthScore, 0, 100),
  };
}

