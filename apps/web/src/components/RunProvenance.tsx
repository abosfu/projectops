import { Manifest } from "../types/runTypes.js";

interface RunProvenanceProps {
  manifest: Manifest;
}

export function RunProvenance({ manifest }: RunProvenanceProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return { dateStr, timeStr };
  };

  const rowCount = manifest.inputRowCount || manifest.totalRows;
  const date = new Date(manifest.createdAt);
  const monthYear = date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <div style={{ 
      fontSize: "12px", 
      color: "#64748b", 
      marginTop: "8px",
      marginBottom: "32px"
    }}>
      Weekly Portfolio Snapshot — {monthYear} • {rowCount} task{rowCount !== 1 ? "s" : ""}
    </div>
  );
}

