import { ProjectSignals, ValidationReport, Manifest } from "../types/runTypes.js";

/**
 * Generate executive summary text from signals and validation data
 */
export function generateExecutiveSummary(
  signals: ProjectSignals | null,
  validation: ValidationReport | null,
  manifest: Manifest | null
): string {
  if (!signals || !validation || !manifest) return "";

  const { scheduleLagCount, budgetOverburnCount } = signals.totals;
  const topSubcontractor = signals.topBottlenecksBySubcontractor[0]?.subcontractor || "none";
  const warningCount =
    validation.warningsSummary.missingTrade +
    validation.warningsSummary.missingSubcontractor +
    validation.warningsSummary.unknownStatusMapped +
    validation.warningsSummary.progressPctClamped +
    validation.warningsSummary.budgetSpentDefaulted;

  const parts: string[] = [];

  if (scheduleLagCount > 0) {
    parts.push(`${scheduleLagCount} task${scheduleLagCount > 1 ? "s" : ""} with schedule lag`);
  } else {
    parts.push("No tasks with schedule lag");
  }

  if (budgetOverburnCount > 0) {
    parts.push(`${budgetOverburnCount} task${budgetOverburnCount > 1 ? "s" : ""} over budget`);
  }

  if (topSubcontractor !== "none") {
    parts.push(`Primary bottleneck: ${topSubcontractor}`);
  }

  if (warningCount > 0) {
    parts.push(
      `${warningCount} data quality warning${warningCount > 1 ? "s" : ""} detected`
    );
  } else {
    parts.push("No data quality warnings");
  }

  return parts.join(". ") + ".";
}
