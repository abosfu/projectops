import { useState, useRef } from "react";

interface CSVUploadProps {
  onUploadSuccess: (runId: string) => void;
}

export function CSVUpload({ onUploadSuccess }: CSVUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      setError("Please upload a CSV file");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("csv", file);

      const response = await fetch("/api/ingest", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to upload CSV" }));
        throw new Error(errorData.error || "Failed to upload CSV");
      }

      const data = await response.json();
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Notify parent to reload and select new run
      onUploadSuccess(data.runId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload CSV");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileSelect}
        disabled={uploading}
        style={{ display: "none" }}
        id="csv-upload-input"
      />
      <label htmlFor="csv-upload-input">
        <button
          type="button"
          disabled={uploading}
          style={{
            padding: "12px 24px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: uploading ? "not-allowed" : "pointer",
            opacity: uploading ? 0.6 : 1,
            border: "none",
            borderRadius: "6px",
            background: "#111",
            color: "#ffffff",
            transition: "opacity 0.2s",
          }}
        >
          {uploading ? "Uploading..." : "Upload Weekly Snapshot CSV"}
        </button>
      </label>
      {error && (
        <div style={{ marginTop: "8px", color: "#dc2626", fontSize: "13px" }}>
          {error}
        </div>
      )}
    </div>
  );
}
