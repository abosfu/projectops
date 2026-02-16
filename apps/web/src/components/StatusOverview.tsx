import { StatusBarChart } from "./StatusBarChart.js";
import { ProjectSignals } from "../types/runTypes.js";

interface StatusOverviewProps {
  signals: ProjectSignals;
}

export function StatusOverview({ signals }: StatusOverviewProps) {
  const statusChartData = Object.entries(signals.byStatus).map(([status, count]) => ({
    status,
    count,
  }));

  return (
    <div className="section">
      <h2>Status Overview</h2>
      <StatusBarChart data={statusChartData} />
    </div>
  );
}
