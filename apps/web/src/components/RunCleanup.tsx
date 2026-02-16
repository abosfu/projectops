import { useState } from "react";

interface RunCleanupProps {
  onCleanupSuccess: () => void;
}

export function RunCleanup({ onCleanupSuccess }: RunCleanupProps) {
  const [cleaning, setCleaning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCleanup = async () => {
    if (!confirm("Delete old demo runs? This will keep the latest 10 demo runs.")) {
      return;
    }

    setError(null);
    setCleaning(true);

    try {
      const response = await fetch("/api/runs/cleanup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          keepLatest: 10,
          includeUploads: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to cleanup runs" }));
        throw new Error(errorData.error || "Failed to cleanup runs");
      }

      const data = await response.json();
      
      // Notify parent to reload
      onCleanupSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cleanup runs");
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleCleanup}
        disabled={cleaning}
        style={{
          padding: "8px 16px",
          fontSize: "12px",
          fontWeight: "500",
          cursor: cleaning ? "not-allowed" : "pointer",
          opacity: cleaning ? 0.6 : 1,
          border: "1px solid #e5e7eb",
          borderRadius: "6px",
          background: "#ffffff",
          color: "#64748b",
        }}
      >
        {cleaning ? "Cleaning..." : "Clean up runs"}
      </button>
      {error && (
        <div style={{ marginTop: "8px", color: "#dc2626", fontSize: "12px" }}>
          {error}
        </div>
      )}
    </div>
  );
}

