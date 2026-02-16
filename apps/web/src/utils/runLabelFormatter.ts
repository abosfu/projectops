import { Manifest, ProjectSignals } from "../types/runTypes.js";

/**
 * Format run label for display
 * Format: "Weekly Snapshot — ProjectOps Demo | Feb 15, 10:12 AM"
 */
export function formatRunLabel(
  manifest: Manifest,
  signals: ProjectSignals | null
): string {
  const date = new Date(manifest.createdAt);
  
  // Format date: "Feb 15"
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  
  // Format time: "10:12 AM"
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  
  // Use runLabel from manifest if available, otherwise fallback
  const label = manifest.runLabel || "Weekly Snapshot";
  
  return `${label} | ${dateStr}, ${timeStr}`;
}
