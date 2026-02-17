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
        <div style={{ fontSize: "12px", color: "#94a3b8" }}>Upload a weekly snapshot to view status overview</div>
      </div>
    );
  }

  return (
    <div>
      <StatusBarChart data={statusChartData} />
    </div>
  );
}
