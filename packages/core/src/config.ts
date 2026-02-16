/**
 * Configuration thresholds for signal computation
 */
export const SIGNAL_THRESHOLDS = {
  /**
   * Percentage threshold for behind-schedule detection
   * Task is behind schedule if (expectedProgressPct - actualProgressPct) >= this value
   */
  BEHIND_SCHEDULE_THRESHOLD_PCT: 10,

  /**
   * Number of downstream tasks to check for critical path risk
   */
  CRITICAL_PATH_DOWNSTREAM_THRESHOLD: 3,

  /**
   * Epsilon for budget overburn detection (small value to handle floating point precision)
   */
  OVERBURN_EPSILON: 0.01,
} as const;

