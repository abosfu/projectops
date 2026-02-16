import { useState } from "react";
import { ValidationReport } from "../types/runTypes.js";
import { getWarningCount } from "../utils/comparisonUtils.js";

interface DataQualitySummaryProps {
  validation: ValidationReport;
}

/**
 * Determine data reliability rating based on warnings and rejected rows
 */
function getReliabilityRating(
  warningCount: number,
  rejectedRows: number
): "Good" | "Fair" | "Poor" {
  const totalIssues = warningCount + rejectedRows;
  
  if (totalIssues === 0) {
    return "Good";
  } else if (totalIssues <= 5) {
    return "Fair";
  } else {
    return "Poor";
  }
}

export function DataQualitySummary({ validation }: DataQualitySummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const warningCount = getWarningCount(validation);
  const rejectedRows = validation.rejectedRows.length;
  const rating = getReliabilityRating(warningCount, rejectedRows);

  const summaryText = `Data reliability: ${rating}`;

  return (
    <div className="section">
      <h2>Data Reliability</h2>
      <p className="data-quality-summary">{summaryText}</p>

      <div className="collapsible-section">
        <div
          className="collapsible-header"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <h3>View details</h3>
          <span style={{ color: "#64748b", fontSize: "14px" }}>
            {isExpanded ? "−" : "+"}
          </span>
        </div>

        {isExpanded && (
          <div className="collapsible-content">
            <div style={{ marginBottom: "24px" }}>
              <h4>Data Issues</h4>
              <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
                {rejectedRows > 0 && (
                  <li>
                    <strong>{rejectedRows} rejected row{rejectedRows !== 1 ? "s" : ""}</strong> — Invalid data that could not be processed
                  </li>
                )}
                {validation.warningsSummary.missingTrade > 0 && (
                  <li>
                    <strong>{validation.warningsSummary.missingTrade} missing trade{validation.warningsSummary.missingTrade !== 1 ? "s" : ""}</strong> — Mapped to "unknown"
                  </li>
                )}
                {validation.warningsSummary.missingSubcontractor > 0 && (
                  <li>
                    <strong>{validation.warningsSummary.missingSubcontractor} missing subcontractor{validation.warningsSummary.missingSubcontractor !== 1 ? "s" : ""}</strong> — Mapped to "unknown"
                  </li>
                )}
                {validation.warningsSummary.unknownStatusMapped > 0 && (
                  <li>
                    <strong>{validation.warningsSummary.unknownStatusMapped} unknown status{validation.warningsSummary.unknownStatusMapped !== 1 ? "es" : ""}</strong> — Mapped to "unknown"
                  </li>
                )}
                {validation.warningsSummary.progressPctClamped > 0 && (
                  <li>
                    <strong>{validation.warningsSummary.progressPctClamped} progress percentage{validation.warningsSummary.progressPctClamped !== 1 ? "s" : ""} clamped</strong> — Adjusted to 0-100 range
                  </li>
                )}
                {validation.warningsSummary.budgetSpentDefaulted > 0 && (
                  <li>
                    <strong>{validation.warningsSummary.budgetSpentDefaulted} budget_spent defaulted</strong> — Set to 0 when missing
                  </li>
                )}
                {warningCount === 0 && rejectedRows === 0 && (
                  <li>No data issues detected</li>
                )}
              </ul>
            </div>

            <div>
              <h4>Data Normalization Assumptions</h4>
              <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
                <li>
                  <strong>Missing trade → "unknown"</strong> when trade field is empty
                </li>
                <li>
                  <strong>Missing subcontractor → "unknown"</strong> when subcontractor field is empty
                </li>
                <li>
                  <strong>Unknown status → "unknown"</strong> when status value is unrecognized
                </li>
                <li>
                  <strong>Missing budget_spent → 0</strong> when budget_spent field is empty
                </li>
                <li>
                  <strong>Progress percentage clamped</strong> to 0-100 range if out of bounds
                </li>
                <li>
                  <strong>Missing actual_start warning:</strong> If progress_pct &gt; 0 but actual_start is missing, schedule lag detection may be less accurate
                </li>
              </ul>
            </div>

            <div style={{ marginTop: "24px" }}>
              <h4>Signal Computation Assumptions</h4>
              <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
                <li>
                  <strong>Behind Schedule Detection:</strong> Task is behind schedule if (expectedProgressPct - actualProgressPct) ≥ 10%. Expected progress is calculated based on planned_start, planned_end, and snapshot time (run createdAt).
                </li>
                <li>
                  <strong>Critical Path Risk:</strong> Task is at risk if blocked, or if any dependency in the chain (up to 3 levels) is blocked or behind schedule.
                </li>
                <li>
                  <strong>Budget Overburn:</strong> Task has overburn if budgetSpent &gt; budgetAllocated × (progressPct/100) + 0.01 (accounts for expected spending based on progress).
                </li>
              </ul>
            </div>

            <div style={{ marginTop: "24px" }}>
              <h4>What Breaks</h4>
              <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
                <li>
                  <strong>Missing dependencies:</strong> Tasks with invalid depends_on_task_id cannot assess critical path risk accurately
                </li>
                <li>
                  <strong>Missing actual_start:</strong> Schedule lag detection is less accurate when actual start dates are not provided
                </li>
                <li>
                  <strong>Incomplete budget data:</strong> Budget overrun calculations are less reliable when budget_spent is missing or defaulted
                </li>
                <li>
                  <strong>Date inconsistencies:</strong> When planned_end {"<"} planned_start, the row is rejected
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
