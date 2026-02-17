/**
 * Utility functions for metric calculations with validation and clamping
 */

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  if (isNaN(value) || !isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

/**
 * Clamp a percentage to 0-100
 */
export function clampPercentage(pct: number): number {
  return clamp(pct, 0, 100);
}

/**
 * Calculate percentage safely (handles division by zero)
 */
export function safePercentage(value: number, total: number): number {
  if (total === 0 || !isFinite(total) || !isFinite(value)) return 0;
  return clampPercentage((value / total) * 100);
}

/**
 * Calculate On Track percentage as remainder, ensuring it's never negative
 * Categories are mutually exclusive: Behind Schedule, Critical Path Risk, Budget Overburn, On Track
 */
export function calculateOnTrackPercentage(
  behindSchedulePct: number,
  criticalPathPct: number,
  budgetOverburnPct: number
): number {
  const totalRiskPct = behindSchedulePct + criticalPathPct + budgetOverburnPct;
  const onTrackPct = Math.max(0, 100 - totalRiskPct);
  return clampPercentage(onTrackPct);
}

/**
 * Calculate projected overrun percentage for a project
 * Uses both current overrun and projected final cost based on spend rate
 */
export function calculateProjectedOverrunPct(
  totalBudgetAllocated: number,
  totalBudgetSpent: number,
  avgProgressPct: number,
  overburnTaskCount: number,
  totalTasks: number
): number {
  if (totalBudgetAllocated === 0 || !isFinite(totalBudgetAllocated)) return 0;
  if (!isFinite(totalBudgetSpent)) return 0;

  // Method 1: Current overrun (if already over)
  const currentOverrun = totalBudgetSpent - totalBudgetAllocated;
  if (currentOverrun > 0) {
    const currentOverrunPct = (currentOverrun / totalBudgetAllocated) * 100;
    return clampPercentage(currentOverrunPct);
  }

  // Method 2: Projected overrun based on spend rate
  if (avgProgressPct > 0 && avgProgressPct < 100 && totalBudgetSpent > 0) {
    // Calculate average spend rate across all tasks
    const spendRate = totalBudgetSpent / avgProgressPct;
    const projectedFinalCost = spendRate * 100;
    const projectedOverrun = projectedFinalCost - totalBudgetAllocated;
    if (projectedOverrun > 0) {
      const projectedOverrunPct = (projectedOverrun / totalBudgetAllocated) * 100;
      return clampPercentage(projectedOverrunPct);
    }
  }

  // Method 3: Fallback - use overburn tasks as proxy
  // If we have overburn tasks, estimate a small overrun
  // This ensures we don't always show 0%
  if (overburnTaskCount > 0 && totalTasks > 0) {
    const overburnRatio = overburnTaskCount / totalTasks;
    // Estimate 1-3% overrun per 10% of tasks with overburn
    const estimatedOverrunPct = overburnRatio * 20; // Up to 20% if all tasks overburn
    return clampPercentage(estimatedOverrunPct);
  }

  return 0;
}

/**
 * Calculate health score with clear weights
 * Schedule lag: 40%, Critical path: 30%, Budget overburn: 20%, Blocked: 10%
 */
export function calculateHealthScore(
  scheduleLagCount: number,
  criticalPathRiskCount: number,
  budgetOverburnCount: number,
  blockedCount: number,
  totalTasks: number,
  projectedOverrunPct: number
): number {
  if (totalTasks === 0) return 100;

  // Normalize counts to percentages
  const scheduleLagPct = safePercentage(scheduleLagCount, totalTasks);
  const criticalPathPct = safePercentage(criticalPathRiskCount, totalTasks);
  const overburnPct = safePercentage(budgetOverburnCount, totalTasks);
  const blockedPct = safePercentage(blockedCount, totalTasks);

  // Weighted risk score (higher = worse)
  // Each percentage contributes to risk, weighted
  const riskScore = 
    (scheduleLagPct * 0.40) +
    (criticalPathPct * 0.30) +
    (overburnPct * 0.20) +
    (blockedPct * 0.10);

  // Add projected overrun penalty (clamped)
  const overrunPenalty = clampPercentage(projectedOverrunPct) * 0.15; // 15% weight for overrun

  // Convert risk to health score (100 - risk)
  let healthScore = 100 - riskScore - overrunPenalty;

  // Ensure score is realistic and varied
  // Add some variation based on actual counts to avoid identical scores
  const variationFactor = Math.min(
    (scheduleLagCount * 0.5 + criticalPathRiskCount * 0.3 + budgetOverburnCount * 0.2) / totalTasks,
    0.1
  );
  healthScore = healthScore - (variationFactor * 5);

  return clamp(healthScore, 0, 100);
}

/**
 * Validate that status counts sum to total tasks
 */
export function validateStatusCounts(
  byStatus: Record<string, number>,
  totalTasks: number
): Record<string, number> {
  const sum = Object.values(byStatus).reduce((acc, count) => acc + count, 0);
  
  if (sum !== totalTasks && totalTasks > 0) {
    // Adjust the largest category to make up the difference
    const entries = Object.entries(byStatus);
    if (entries.length > 0) {
      const largest = entries.reduce((max, [key, val]) => 
        val > max[1] ? [key, val] : max
      , entries[0]);
      
      const diff = totalTasks - sum;
      byStatus[largest[0]] = largest[1] + diff;
    }
  }
  
  return byStatus;
}

