import { ProjectSignals } from "../types/runTypes.js";
import { ProgressBar } from "./ProgressBar.js";
import { getTaskMetricSeverity, getSeverityColor } from "../utils/severityHelpers.js";
import { calculateOnTrackPercentage, safePercentage } from "../utils/metricDisplayUtils.js";

interface RiskDistributionProps {
  signals: ProjectSignals;
}

export function RiskDistribution({ signals }: RiskDistributionProps) {
  const totalTasks = signals.totals.tasks;
  
  if (totalTasks === 0) {
    return (
      <div style={{ 
        padding: "24px", 
        textAlign: "center", 
        color: "#64748b", 
        fontSize: "13px",
        border: "1px solid #e5e7eb",
        borderRadius: "4px"
      }}>
        <div style={{ marginBottom: "4px", fontWeight: "500" }}>No tasks available</div>
        <div style={{ fontSize: "12px", color: "#94a3b8" }}>Upload a weekly snapshot to view risk distribution</div>
      </div>
    );
  }

  // Calculate percentages safely
  const behindPct = safePercentage(signals.totals.scheduleLagCount, totalTasks);
  const criticalPct = safePercentage(signals.totals.criticalPathRiskCount, totalTasks);
  const overburnPct = safePercentage(signals.totals.budgetOverburnCount, totalTasks);
  const onTrackPct = calculateOnTrackPercentage(signals);
  
  // Calculate counts from percentages to ensure consistency
  const onTrackCount = Math.round((onTrackPct / 100) * totalTasks);

  const isLowSampleSize = totalTasks < 10;

  return (
    <div>
      {isLowSampleSize && (
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 10px",
          backgroundColor: "#fef3c7",
          border: "1px solid #fcd34d",
          borderRadius: "4px",
          marginBottom: "16px",
          fontSize: "11px",
          color: "#92400e",
          fontWeight: "500"
        }}>
          <span>⚠</span>
          <span>Limited dataset ({totalTasks} tasks). Metrics should be interpreted with caution.</span>
        </div>
      )}
      <div style={{ marginBottom: "12px" }}>
        <ProgressBar
          label="Tasks Behind Schedule"
          value={signals.totals.scheduleLagCount}
          total={totalTasks}
          variant="breached"
        />
      </div>
      <div style={{ marginBottom: "12px" }}>
        <ProgressBar
          label="Critical Path Risk"
          value={signals.totals.criticalPathRiskCount}
          total={totalTasks}
          variant="high"
        />
      </div>
      <div style={{ marginBottom: "12px" }}>
        <ProgressBar
          label="Budget Overburn"
          value={signals.totals.budgetOverburnCount}
          total={totalTasks}
          variant="medium"
        />
      </div>
      <div>
        <ProgressBar
          label="On Track"
          value={onTrackCount}
          total={totalTasks}
          variant="low"
        />
      </div>
    </div>
  );
}
