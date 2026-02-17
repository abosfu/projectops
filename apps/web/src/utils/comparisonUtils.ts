import { ProjectSignals, ValidationReport } from "../types/runTypes.js";

/**
 * Compute delta between two numbers
 */
export function computeDelta(
  current: number,
  compare: number | null
): number | null {
  if (compare === null) return null;
  return current - compare;
}

/**
 * Format delta as string with sign
 */
export function formatDelta(
  delta: number | null,
  isWorse: boolean = false,
  formatter?: (value: number) => string
): string {
  if (delta === null) return "";
  if (delta === 0) return "";
  const sign = delta > 0 ? "+" : "";
  const value = formatter ? formatter(Math.abs(delta)) : Math.abs(delta);
  return `(${sign}${value})`;
}

/**
 * Get warning count from validation report
 */
export function getWarningCount(
  validation: ValidationReport | null
): number {
  if (!validation) return 0;
  return (
    validation.warningsSummary.missingTrade +
    validation.warningsSummary.missingSubcontractor +
    validation.warningsSummary.unknownStatusMapped +
    validation.warningsSummary.progressPctClamped +
    validation.warningsSummary.budgetSpentDefaulted
  );
}
