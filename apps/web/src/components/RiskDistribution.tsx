import { ProjectSignals } from "../types/runTypes.js";
import { ProgressBar } from "./ProgressBar.js";

interface RiskDistributionProps {
  signals: ProjectSignals;
}

export function RiskDistribution({ signals }: RiskDistributionProps) {
  const onTrack = signals.totals.tasks - signals.totals.scheduleLagCount - signals.totals.criticalPathRiskCount;

  return (
    <div className="section">
      <h2>Project Risk Distribution</h2>
      {signals.totals.tasks > 0 && (
        <div style={{ marginTop: "24px" }}>
          <ProgressBar
            label="Tasks Behind Schedule"
            value={signals.totals.scheduleLagCount}
            total={signals.totals.tasks}
            variant="breached"
          />
          <ProgressBar
            label="Critical Path Risk"
            value={signals.totals.criticalPathRiskCount}
            total={signals.totals.tasks}
            variant="high"
          />
          <ProgressBar
            label="Budget Overburn"
            value={signals.totals.budgetOverburnCount}
            total={signals.totals.tasks}
            variant="medium"
          />
          <ProgressBar
            label="On Track"
            value={onTrack}
            total={signals.totals.tasks}
            variant="low"
          />
        </div>
      )}
    </div>
  );
}
