import { ProjectSignals } from "../types/runTypes.js";
import { computeDelta, formatDelta } from "../utils/comparisonUtils.js";

interface PerProjectTableProps {
  signals: ProjectSignals;
  compareSignals: ProjectSignals | null;
}

export function PerProjectTable({ signals, compareSignals }: PerProjectTableProps) {
  if (signals.perProjectRiskSummary.length === 0) return null;

  const formatCurrency = (amount: number): string => {
    if (amount < 1000) {
      return `$${Math.round(amount)}`;
    }
    if (amount < 1000000) {
      return `$${(amount / 1000).toFixed(1)}k`;
    }
    return `$${(amount / 1000000).toFixed(2)}M`;
  };

  const getHealthScoreColor = (score: number): string => {
    if (score >= 80) return "#16a34a"; // green
    if (score >= 60) return "#ca8a04"; // yellow
    return "#dc2626"; // red
  };

  return (
    <div>
      {signals.perProjectRiskSummary.length === 0 ? (
        <div style={{ 
          padding: "24px", 
          textAlign: "center", 
          color: "#64748b", 
          fontSize: "13px",
          border: "1px solid #e5e7eb",
          borderRadius: "4px"
        }}>
          <div style={{ marginBottom: "4px", fontWeight: "500" }}>No project data available</div>
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>Upload a weekly snapshot to view project summaries</div>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", fontWeight: "600" }}>Project</th>
              <th style={{ textAlign: "right", padding: "10px 12px", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", fontWeight: "600" }}>Health Score</th>
              <th style={{ textAlign: "right", padding: "10px 12px", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", fontWeight: "600" }}>Behind Schedule</th>
              <th style={{ textAlign: "right", padding: "10px 12px", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", fontWeight: "600" }}>Critical Path Risks</th>
              <th style={{ textAlign: "right", padding: "10px 12px", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", fontWeight: "600" }}>Overburn Tasks</th>
              <th style={{ textAlign: "right", padding: "10px 12px", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", fontWeight: "600" }}>Projected Overrun $</th>
            </tr>
          </thead>
          <tbody>
            {signals.perProjectRiskSummary.map((project, idx) => {
            const compareProject = compareSignals?.perProjectRiskSummary.find(
              (p) => p.projectId === project.projectId
            );

            // Calculate projected overrun amount: (spent - allocated) if positive, else $0
            const projectedOverrunAmount = Math.max(0, project.totalBudgetSpent - project.totalBudgetAllocated);
            
            // Calculate comparison delta for overrun amount
            let overrunDelta: number | null = null;
            if (compareProject) {
              const compareOverrunAmount = Math.max(0, compareProject.totalBudgetSpent - compareProject.totalBudgetAllocated);
              overrunDelta = projectedOverrunAmount - compareOverrunAmount;
            }

            return (
              <tr 
                key={idx}
                style={{
                  backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                  borderBottom: "1px solid #f1f5f9"
                }}
              >
                <td style={{ textAlign: "left", padding: "12px", fontSize: "13px" }}>
                  <strong style={{ fontWeight: "600", color: "#111" }}>{project.projectId}</strong>
                </td>
                <td style={{ textAlign: "right", padding: "12px", fontVariantNumeric: "tabular-nums" }}>
                  <span
                    style={{
                      fontSize: "16px",
                      fontWeight: "700",
                      color: getHealthScoreColor(project.healthScore),
                    }}
                  >
                    {project.healthScore.toFixed(1)}
                  </span>
                  {compareProject && (
                    <span
                      className={`delta ${
                        project.healthScore < compareProject.healthScore
                          ? "worsened"
                          : project.healthScore > compareProject.healthScore
                          ? "improved"
                          : ""
                      }`}
                    >
                      {formatDelta(
                        computeDelta(project.healthScore, compareProject.healthScore),
                        false,
                        (val) => val.toFixed(1)
                      )}
                    </span>
                  )}
                </td>
                <td style={{ textAlign: "right", padding: "12px", fontVariantNumeric: "tabular-nums", fontSize: "13px" }}>
                  {project.scheduleLagCount}
                  {compareProject && (
                    <span
                      className={`delta ${
                        formatDelta(
                          computeDelta(project.scheduleLagCount, compareProject.scheduleLagCount),
                          true
                        ).includes("+")
                          ? "worsened"
                          : "improved"
                      }`}
                    >
                      {formatDelta(
                        computeDelta(project.scheduleLagCount, compareProject.scheduleLagCount),
                        true
                      )}
                    </span>
                  )}
                </td>
                <td style={{ textAlign: "right", padding: "12px", fontVariantNumeric: "tabular-nums", fontSize: "13px" }}>
                  {project.criticalPathRiskCount}
                  {compareProject && (
                    <span
                      className={`delta ${
                        formatDelta(
                          computeDelta(project.criticalPathRiskCount, compareProject.criticalPathRiskCount),
                          true
                        ).includes("+")
                          ? "worsened"
                          : "improved"
                      }`}
                    >
                      {formatDelta(
                        computeDelta(project.criticalPathRiskCount, compareProject.criticalPathRiskCount),
                        true
                      )}
                    </span>
                  )}
                </td>
                <td style={{ textAlign: "right", padding: "12px", fontVariantNumeric: "tabular-nums", fontSize: "13px" }}>
                  {project.budgetOverburnCount}
                  {compareProject && (
                    <span
                      className={`delta ${
                        formatDelta(
                          computeDelta(project.budgetOverburnCount, compareProject.budgetOverburnCount),
                          true
                        ).includes("+")
                          ? "worsened"
                          : "improved"
                      }`}
                    >
                      {formatDelta(
                        computeDelta(project.budgetOverburnCount, compareProject.budgetOverburnCount),
                        true
                      )}
                    </span>
                  )}
                </td>
                <td style={{ textAlign: "right", padding: "12px", fontVariantNumeric: "tabular-nums", fontSize: "13px" }}>
                  {formatCurrency(projectedOverrunAmount)}
                  {overrunDelta !== null && overrunDelta !== 0 && (
                    <span
                      className={`delta ${overrunDelta > 0 ? "worsened" : "improved"}`}
                    >
                      {overrunDelta > 0 ? "+" : ""}{formatCurrency(overrunDelta)}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      )}
    </div>
  );
}
