import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { ingestCSV } from "../packages/core/src/ingest.js";

describe("Report Generation", () => {
  it("1) dashboard_report.html is written and contains 'Run Summary'", () => {
    // Create a temporary CSV for testing
    const testCSV = `project_id,task_id,task_name,trade,subcontractor,planned_start,planned_end,status,progress_pct,budget_allocated,budget_spent
PROJ-001,TASK-001,Foundation Pour,Concrete,ABC Concrete Co,2024-01-15T10:00:00Z,2024-01-20T10:00:00Z,in_progress,75,50000,40000
PROJ-001,TASK-002,Frame Walls,Carpentry,XYZ Framing,2024-01-20T10:00:00Z,2024-01-25T10:00:00Z,not_started,0,30000,0`;

    const testCSVPath = join(process.cwd(), "test-temp.csv");
    writeFileSync(testCSVPath, testCSV, "utf-8");

    try {
      // Run ingestion
      const result = ingestCSV(testCSVPath);

      // Verify report was generated
      expect(result.reportPath).toBeDefined();
      expect(existsSync(result.reportPath)).toBe(true);

      // Read and verify report content
      const reportContent = readFileSync(result.reportPath, "utf-8");
      expect(reportContent).toContain("Run Summary");
      expect(reportContent).toContain("Project Signals");
      expect(reportContent).toContain("Data Quality");
      expect(reportContent).toContain("Explainability");
    } finally {
      // Cleanup
      if (existsSync(testCSVPath)) {
        unlinkSync(testCSVPath);
      }
    }
  });
});
