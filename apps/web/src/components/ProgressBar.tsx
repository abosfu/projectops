interface ProgressBarProps {
  label: string;
  value: number;
  total: number;
  variant: "breached" | "high" | "medium" | "low";
}

export function ProgressBar({ label, value, total, variant }: ProgressBarProps) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="progress-bar-container">
      <div className="progress-bar-label">
        <span>{label}</span>
        <span>{percentage.toFixed(1)}%</span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-bar-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
