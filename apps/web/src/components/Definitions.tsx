export function Definitions() {
  return (
    <div style={{ fontSize: "12px", color: "#475569", lineHeight: "1.6" }}>
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontWeight: "600", color: "#111", marginBottom: "8px", fontSize: "13px" }}>Metric Calculations</div>
          
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontWeight: "600", color: "#111", marginBottom: "4px" }}>Behind Schedule</div>
            <div>A task is behind schedule if expected progress exceeds actual progress by 10% or more.</div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
              Expected progress is computed from planned start and end dates relative to snapshot time. Formula: (snapshot_time - planned_start) / (planned_end - planned_start) × 100.
            </div>
          </div>
          
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontWeight: "600", color: "#111", marginBottom: "4px" }}>Budget Overburn</div>
            <div>A task has budget overburn if budget spent exceeds budget allocated.</div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
              {"Comparison is direct: budget_spent > budget_allocated. No progress-based projection in v1."}
            </div>
          </div>
          
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontWeight: "600", color: "#111", marginBottom: "4px" }}>Critical Path Risk</div>
            <div>A task is at critical path risk if:</div>
            <div style={{ marginLeft: "12px", marginTop: "4px" }}>
              • Task status is blocked, or<br />
              • Task depends on another task that is blocked or behind schedule
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
              Only direct dependencies are evaluated (no recursion). Categories are mutually exclusive.
            </div>
          </div>
          
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontWeight: "600", color: "#111", marginBottom: "4px" }}>On Track</div>
            <div>Tasks that do not fall into any of the above categories.</div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
              Calculated as remainder: total_tasks - (behind_schedule + critical_path_risk + budget_overburn).
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "20px", paddingTop: "16px", borderTop: "1px solid #e5e7eb" }}>
          <div style={{ fontWeight: "600", color: "#111", marginBottom: "8px", fontSize: "13px" }}>Health Score Calculation</div>
          <div style={{ fontSize: "11px", color: "#94a3b8" }}>
            Health score is computed using weighted risk factors: Schedule lag (40%), Critical path (30%), Budget overburn (20%), Blocked tasks (10%), and Projected overrun penalty (15%). Score ranges from 0-100, where higher values indicate better health.
          </div>
        </div>

        <div style={{ paddingTop: "16px", borderTop: "1px solid #e5e7eb" }}>
          <div style={{ fontWeight: "600", color: "#111", marginBottom: "8px", fontSize: "13px" }}>Projected Overrun</div>
          <div style={{ fontSize: "11px", color: "#94a3b8" }}>
            {"Projected overrun is calculated using current overrun (if spent > allocated) or projected final cost based on spend rate. Formula: (spend_rate × 100) - budget_allocated, where spend_rate = budget_spent / avg_progress_pct."}
          </div>
        </div>
      </div>
  );
}

