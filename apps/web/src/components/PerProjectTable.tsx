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
    <div className="section">
      <h2>Per-Project Summary</h2>
      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Health Score</th>
            <th>Behind Schedule</th>
            <th>Critical Path Risks</th>
            <th>Overburn Tasks</th>
            <th>Projected Overrun $</th>
          </tr>
        </thead>
        <tbody>
          {signals.perProjectRiskSummary.map((project, idx) => {
            const compareProject = compareSignals?.perProjectRiskSummary.find(
              (p) => p.projectId === project.projectId
            );

            // Calculate projected overrun amount
            const projectedOverrunAmount = (project.projectedOverrunPct / 100) * project.totalBudgetAllocated;
            
            // Calculate comparison delta for overrun amount
            let overrunDelta: number | null = null;
            if (compareProject) {
              const compareOverrunAmount = (compareProject.projectedOverrunPct / 100) * compareProject.totalBudgetAllocated;
              overrunDelta = projectedOverrunAmount - compareOverrunAmount;
            }

            return (
              <tr key={idx}>
                <td>
                  <strong>{project.projectId}</strong>
                </td>
                <td>
                  <span
                    style={{
                      fontSize: "18px",
                      fontWeight: "700",
                      color: getHealthScoreColor(project.healthScore),
                    }}
                  >
                    {project.healthScore}
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
                        false
                      )}
                    </span>
                  )}
                </td>
                <td>
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
                <td>
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
                <td>
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
                <td>
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
    </div>
  );
}
