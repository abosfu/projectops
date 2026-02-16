import { describe, it, expect } from "vitest";
import { validateRow } from "../packages/core/src/validate.js";
import { RawCSVRow } from "../packages/core/src/schema.js";

describe("Ingestion Validation", () => {
  it("1) Valid row passes cleanly", () => {
    const row: RawCSVRow = {
      project_id: "PROJ-001",
      task_id: "TASK-123",
      task_name: "Foundation Pour",
      trade: "Concrete",
      subcontractor: "ABC Concrete Co",
      planned_start: "2024-01-15T10:00:00Z",
      planned_end: "2024-01-20T10:00:00Z",
      actual_start: "2024-01-15T11:00:00Z",
      progress_pct: "75",
      budget_allocated: "50000",
      budget_spent: "40000",
      status: "in_progress",
    };

    const result = validateRow(row, 1);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.normalized).toBeDefined();
    expect(result.normalized?.taskId).toBe("TASK-123");
    expect(result.normalized?.projectId).toBe("PROJ-001");
    expect(result.normalized?.status).toBe("in_progress");
    expect(result.normalized?.progressPct).toBe(75);
    expect(result.normalized?.budgetAllocated).toBe(50000);
    expect(result.normalized?.budgetSpent).toBe(40000);
  });

  it("2) Missing project_id is rejected", () => {
    const row: RawCSVRow = {
      task_id: "TASK-123",
      planned_start: "2024-01-15T10:00:00Z",
      planned_end: "2024-01-20T10:00:00Z",
      status: "in_progress",
    };

    const result = validateRow(row, 1);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Missing required field: project_id");
    expect(result.normalized).toBeUndefined();
  });

  it("3) Invalid planned_start is rejected", () => {
    const row: RawCSVRow = {
      project_id: "PROJ-001",
      task_id: "TASK-123",
      planned_start: "invalid-date",
      planned_end: "2024-01-20T10:00:00Z",
      status: "in_progress",
    };

    const result = validateRow(row, 1);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("planned_start"))).toBe(true);
    expect(result.normalized).toBeUndefined();
  });

  it("4) Missing budget_spent defaults to 0 with warning", () => {
    const row: RawCSVRow = {
      project_id: "PROJ-001",
      task_id: "TASK-123",
      planned_start: "2024-01-15T10:00:00Z",
      planned_end: "2024-01-20T10:00:00Z",
      budget_allocated: "50000",
      status: "in_progress",
    };

    const result = validateRow(row, 1);

    expect(result.isValid).toBe(true);
    expect(result.normalized).toBeDefined();
    expect(result.normalized?.budgetSpent).toBe(0);
    expect(
      result.warnings.some((w) => w.includes("budget_spent") && w.includes("defaulting"))
    ).toBe(true);
  });

  it("5) Unknown status maps to 'unknown' with warning", () => {
    const row: RawCSVRow = {
      project_id: "PROJ-001",
      task_id: "TASK-123",
      planned_start: "2024-01-15T10:00:00Z",
      planned_end: "2024-01-20T10:00:00Z",
      status: "custom_status", // Unknown status
    };

    const result = validateRow(row, 1);

    expect(result.isValid).toBe(true);
    expect(result.normalized).toBeDefined();
    expect(result.normalized?.status).toBe("unknown");
    expect(
      result.warnings.some((w) => w.includes("status") && w.includes("unknown"))
    ).toBe(true);
  });

  it("6) planned_end < planned_start is rejected", () => {
    const row: RawCSVRow = {
      project_id: "PROJ-001",
      task_id: "TASK-123",
      planned_start: "2024-01-20T10:00:00Z",
      planned_end: "2024-01-15T10:00:00Z", // Before planned_start
      status: "in_progress",
    };

    const result = validateRow(row, 1);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("planned_end") && e.includes("planned_start"))).toBe(true);
    expect(result.normalized).toBeUndefined();
  });

  it("7) progress_pct out of range is clamped with warning", () => {
    const row: RawCSVRow = {
      project_id: "PROJ-001",
      task_id: "TASK-123",
      planned_start: "2024-01-15T10:00:00Z",
      planned_end: "2024-01-20T10:00:00Z",
      progress_pct: "150", // Above 100
      status: "in_progress",
    };

    const result = validateRow(row, 1);

    expect(result.isValid).toBe(true);
    expect(result.normalized).toBeDefined();
    expect(result.normalized?.progressPct).toBe(100);
    expect(
      result.warnings.some((w) => w.includes("progress_pct") && (w.includes("clamped") || w.includes("above")))
    ).toBe(true);
  });
});
