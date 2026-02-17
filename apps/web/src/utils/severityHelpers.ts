/**
 * Severity levels for risk metrics
 */
export type SeverityLevel = "good" | "watch" | "atRisk";

/**
 * Severity thresholds for task-based metrics (Behind Schedule, Critical Path, Overburn)
 * Good: <= 10%
 * Watch: 10-20%
 * At Risk: > 20%
 */
export function getTaskMetricSeverity(value: number, total: number): SeverityLevel {
  if (total === 0) return "good";
  const percentage = (value / total) * 100;
  if (percentage <= 10) return "good";
  if (percentage <= 20) return "watch";
  return "atRisk";
}

/**
 * Severity thresholds for Projected Overrun percentage
 * Good: <= 2%
 * Watch: 2-6%
 * At Risk: > 6%
 */
export function getOverrunSeverity(percentage: number): SeverityLevel {
  if (percentage <= 2) return "good";
  if (percentage <= 6) return "watch";
  return "atRisk";
}

/**
 * Get color for severity level
 */
export function getSeverityColor(severity: SeverityLevel): string {
  switch (severity) {
    case "good":
      return "#16a34a"; // green
    case "watch":
      return "#ca8a04"; // amber
    case "atRisk":
      return "#dc2626"; // red
  }
}

/**
 * Get health score label
 * 80+ = Healthy
 * 60-79 = Stable
 * <60 = At Risk
 */
export function getHealthScoreLabel(score: number): string {
  if (score >= 80) return "Healthy";
  if (score >= 60) return "Stable";
  return "At Risk";
}

/**
 * Get health score color
 * 80+ = Healthy (green)
 * 60-79 = Stable (amber)
 * <60 = At Risk (red)
 */
export function getHealthScoreColor(score: number): string {
  if (score >= 80) return "#16a34a"; // green
  if (score >= 60) return "#ca8a04"; // amber
  return "#dc2626"; // red
}

