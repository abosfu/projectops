import { Manifest, ProjectSignals, ValidationReport } from "../types/runTypes.js";
import { computeDelta, formatDelta, getWarningCount } from "../utils/comparisonUtils.js";

interface ExecutiveSnapshotProps {
  manifest: Manifest;
  signals: ProjectSignals;
  validation: ValidationReport;
  compareSignals: ProjectSignals | null;
  compareValidation: ValidationReport | null;
}

export function ExecutiveSnapshot({
  manifest,
  signals,
  validation,
  compareSignals,
  compareValidation,
}: ExecutiveSnapshotProps) {
  const globalHealthScore = signals.globalHealthScore;
  const tasksBehindSchedule = signals.totals.scheduleLagCount;
  const criticalPathRisk = signals.totals.criticalPathRiskCount;
  const budgetOverburn = signals.totals.budgetOverburnCount;
  const projectedOverrun = signals.totals.projectedOverrunCount;

  const getTrend = (current: number, previous: number | null) => {
    if (previous === null) return null;
    const delta = computeDelta(current, previous);
    if (delta === null) return null;
    if (delta > 0) return `+${delta} from previous`;
    if (delta < 0) return `${delta} from previous`;
    return "No change";
  };

  const getHealthScoreColor = (score: number): string => {
    if (score >= 80) return "#16a34a"; // green
    if (score >= 60) return "#ca8a04"; // yellow
    return "#dc2626"; // red
  };

  return (
    <div className="executive-snapshot">
      <div className="kpi-metric" style={{ gridColumn: "1 / -1", borderBottom: "2px solid #e5e7eb", paddingBottom: "24px", marginBottom: "16px" }}>
        <div className="kpi-label">Project Health Score</div>
        <div 
          className="kpi-value" 
          style={{ 
            fontSize: "56px", 
            fontWeight: "700",
            color: getHealthScoreColor(globalHealthScore)
          }}
        >
          {globalHealthScore}
        </div>
        {compareSignals && (
          <div className="kpi-trend">
            {getTrend(globalHealthScore, compareSignals.globalHealthScore) || "No comparison"}
          </div>
        )}
      </div>

      <div className="kpi-metric">
        <div className="kpi-label">Tasks Behind Schedule</div>
        <div className={`kpi-value ${tasksBehindSchedule > 0 ? "breached-positive" : ""}`}>
          {tasksBehindSchedule}
        </div>
        {compareSignals && (
          <div className="kpi-trend">
            {getTrend(tasksBehindSchedule, compareSignals.totals.scheduleLagCount) || "No comparison"}
          </div>
        )}
      </div>

      <div className="kpi-metric">
        <div className="kpi-label">Critical Path Risk</div>
        <div className="kpi-value">{criticalPathRisk}</div>
        {compareSignals && (
          <div className="kpi-trend">
            {getTrend(criticalPathRisk, compareSignals.totals.criticalPathRiskCount) || "No comparison"}
          </div>
        )}
      </div>

      <div className="kpi-metric">
        <div className="kpi-label">Budget Overburn</div>
        <div className="kpi-value">{budgetOverburn}</div>
        {compareSignals && (
          <div className="kpi-trend">
            {getTrend(budgetOverburn, compareSignals.totals.budgetOverburnCount) || "No comparison"}
          </div>
        )}
      </div>

      <div className="kpi-metric">
        <div className="kpi-label">Projected Overrun</div>
        <div className="kpi-value">{projectedOverrun}</div>
        {compareSignals && (
          <div className="kpi-trend">
            {getTrend(projectedOverrun, compareSignals.totals.projectedOverrunCount) || "No comparison"}
          </div>
        )}
      </div>
    </div>
  );
}
