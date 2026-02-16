import { useState } from "react";

interface DemoRunGeneratorProps {
  onGenerateSuccess: (runId: string) => void;
}

export function DemoRunGenerator({ onGenerateSuccess }: DemoRunGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setError(null);
    setGenerating(true);

    try {
      const response = await fetch("/api/demo-run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to generate demo run" }));
        throw new Error(errorData.error || "Failed to generate demo run");
      }

      const data = await response.json();
      
      // Notify parent to reload and select new run
      onGenerateSuccess(data.runId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate demo run");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating}
        style={{
          padding: "10px 20px",
          fontSize: "14px",
          fontWeight: "500",
          cursor: generating ? "not-allowed" : "pointer",
          opacity: generating ? 0.6 : 1,
          border: "1px solid #e5e7eb",
          borderRadius: "6px",
          background: "#ffffff",
          color: "#111",
        }}
      >
        {generating ? "Generating..." : "Generate Demo Run"}
      </button>
      {error && (
        <div style={{ marginTop: "8px", color: "#dc2626", fontSize: "14px" }}>
          {error}
        </div>
      )}
    </div>
  );
}

