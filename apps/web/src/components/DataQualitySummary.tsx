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
    <div>
      <p className="data-quality-summary">{summaryText}</p>

      <div className="collapsible-section">
        <div
          className="collapsible-header"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <h3>View Details</h3>
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
                    <strong>{validation.warningsSummary.unknownStatusMapped} unrecognized status{validation.warningsSummary.unknownStatusMapped !== 1 ? "es" : ""}</strong> — Mapped to "unknown"
                  </li>
                )}
                {validation.warningsSummary.progressPctClamped > 0 && (
                  <li>
                    <strong>{validation.warningsSummary.progressPctClamped} progress percentage{validation.warningsSummary.progressPctClamped !== 1 ? "s" : ""} out of range</strong> — Adjusted to 0-100 range
                  </li>
                )}
                {validation.warningsSummary.budgetSpentDefaulted > 0 && (
                  <li>
                    <strong>{validation.warningsSummary.budgetSpentDefaulted} missing budget spent value{validation.warningsSummary.budgetSpentDefaulted !== 1 ? "s" : ""}</strong> — Defaulted to 0
                  </li>
                )}
                {warningCount === 0 && rejectedRows === 0 && (
                  <li>No data issues detected</li>
                )}
              </ul>
            </div>

            <div>
              <h4>Data Normalization</h4>
              <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
                <li>
                  <strong>Missing trade:</strong> Mapped to "unknown" when trade field is empty
                </li>
                <li>
                  <strong>Missing subcontractor:</strong> Mapped to "unknown" when subcontractor field is empty
                </li>
                <li>
                  <strong>Unrecognized status:</strong> Mapped to "unknown" when status value is not recognized
                </li>
                <li>
                  <strong>Missing budget spent:</strong> Defaulted to 0 when budget_spent field is empty
                </li>
                <li>
                  <strong>Progress percentage:</strong> Adjusted to 0-100 range if out of bounds
                </li>
                <li>
                  <strong>Missing actual start:</strong> Schedule lag detection may be less accurate when actual start dates are not provided
                </li>
              </ul>
            </div>

            <div style={{ marginTop: "24px" }}>
              <h4>Calculation Methods</h4>
              <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
                <li>
                  <strong>Behind Schedule:</strong> Task is behind schedule if expected progress exceeds actual progress by 10% or more. Expected progress is calculated from planned dates relative to snapshot time.
                </li>
                <li>
                  <strong>Critical Path Risk:</strong> Task is at risk if blocked, or if its direct dependency is blocked or behind schedule.
                </li>
                <li>
                  <strong>Budget Overburn:</strong> Task has overburn if budget spent exceeds budget allocated.
                </li>
              </ul>
            </div>

            <div style={{ marginTop: "24px" }}>
              <h4>Data Quality Limitations</h4>
              <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
                <li>
                  <strong>Missing dependencies:</strong> Tasks with invalid dependency references cannot assess critical path risk accurately
                </li>
                <li>
                  <strong>Missing actual start dates:</strong> Schedule lag detection is less accurate when actual start dates are not provided
                </li>
                <li>
                  <strong>Incomplete budget data:</strong> Budget overrun calculations are less reliable when budget spent values are missing
                </li>
                <li>
                  <strong>Date inconsistencies:</strong> Rows with planned end date before planned start date are rejected
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
