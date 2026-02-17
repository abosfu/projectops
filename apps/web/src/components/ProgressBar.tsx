import { getTaskMetricSeverity, getSeverityColor } from "../utils/severityHelpers.js";
import { safePercentage } from "../utils/metricDisplayUtils.js";

interface ProgressBarProps {
  label: string;
  value: number;
  total: number;
  variant: "breached" | "high" | "medium" | "low";
}

export function ProgressBar({ label, value, total, variant }: ProgressBarProps) {
  // Use safe percentage calculation that clamps to 0-100
  const percentage = safePercentage(value, total);
  
  // Use severity-based coloring for risk metrics
  const severity = getTaskMetricSeverity(value, total);
  const color = getSeverityColor(severity);

  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: "6px"
      }}>
        <span style={{ 
          fontSize: "10px", 
          fontWeight: "600", 
          color: "#111", 
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }}>
          {label}
        </span>
        <span style={{ 
          fontSize: "12px", 
          fontWeight: "500", 
          color: "#64748b",
          fontVariantNumeric: "tabular-nums"
        }}>
          {percentage.toFixed(1)}%
        </span>
      </div>
      <div style={{
        width: "100%",
        height: "4px",
        background: "#f1f5f9",
        borderRadius: "2px",
        overflow: "hidden"
      }}>
        <div
          style={{ 
            width: `${Math.max(0, Math.min(100, percentage))}%`, 
            height: "100%",
            background: color,
            transition: "width 0.3s ease",
            borderRadius: "2px"
          }}
        />
      </div>
    </div>
  );
}
