/**
 * Utility functions for displaying metrics in the UI
 * Ensures all percentages are clamped and validated
 */

import { ProjectSignals } from "../types/runTypes.js";

/**
 * Clamp percentage to 0-100
 */
export function clampPercentage(pct: number): number {
  if (isNaN(pct) || !isFinite(pct)) return 0;
  return Math.max(0, Math.min(100, pct));
}

/**
 * Calculate On Track percentage safely
 */
export function calculateOnTrackPercentage(signals: ProjectSignals): number {
  const totalTasks = signals.totals.tasks;
  if (totalTasks === 0) return 0;

  const behindPct = clampPercentage((signals.totals.scheduleLagCount / totalTasks) * 100);
  const criticalPct = clampPercentage((signals.totals.criticalPathRiskCount / totalTasks) * 100);
  const overburnPct = clampPercentage((signals.totals.budgetOverburnCount / totalTasks) * 100);

  const totalRiskPct = behindPct + criticalPct + overburnPct;
  const onTrackPct = Math.max(0, 100 - totalRiskPct);

  return clampPercentage(onTrackPct);
}

/**
 * Get safe percentage for display
 */
export function safePercentage(value: number, total: number): number {
  if (total === 0 || !isFinite(total) || !isFinite(value)) return 0;
  return clampPercentage((value / total) * 100);
}

