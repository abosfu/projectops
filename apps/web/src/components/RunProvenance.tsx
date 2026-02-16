import { Manifest } from "../types/runTypes.js";

interface RunProvenanceProps {
  manifest: Manifest;
}

export function RunProvenance({ manifest }: RunProvenanceProps) {
  const formatSource = () => {
    if (manifest.sourceType === "demo") {
      const seedText = manifest.seed !== null && manifest.seed !== undefined 
        ? `seed ${manifest.seed}` 
        : "seed unknown";
      return `Demo (${seedText})`;
    } else if (manifest.sourceType === "upload") {
      return "Uploaded CSV";
    } else {
      return "CLI";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const rowCount = manifest.inputRowCount || manifest.totalRows;
  const generatedAt = manifest.generatedAt || manifest.createdAt;

  return (
    <div style={{ 
      fontSize: "12px", 
      color: "#64748b", 
      marginTop: "8px",
      marginBottom: "24px"
    }}>
      Source: {formatSource()} • {rowCount} row{rowCount !== 1 ? "s" : ""} • Generated {formatDate(generatedAt)}
    </div>
  );
}

