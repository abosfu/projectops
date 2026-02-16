import { describe, it, expect } from "vitest";
import { computeSignals } from "../packages/core/src/signals.js";
import { TaskNormalized } from "../packages/core/src/schema.js";

describe("Project Signals", () => {
  const now = new Date();
  const baseTask: TaskNormalized = {
    taskId: "TASK-001",
    projectId: "PROJ-001",
    taskName: "Test Task",
    trade: "General",
    subcontractor: "ABC Co",
    plannedStart: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    plannedEnd: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
    progressPct: 50,
    budgetAllocated: 10000,
    budgetSpent: 5000,
    status: "in_progress",
    warnings: [],
  };

  it("1) Schedule lag detection works correctly", () => {
    const runId = "test-run-1";

    const tasks: TaskNormalized[] = [
      // Task with schedule lag (past planned end, not done)
      {
        ...baseTask,
        taskId: "TASK-001",
        plannedEnd: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        status: "in_progress",
      },
      // Task with actual start after planned start
      {
        ...baseTask,
        taskId: "TASK-002",
        plannedStart: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        actualStart: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // Started 2 days late
        status: "in_progress",
      },
      // Task on schedule
      {
        ...baseTask,
        taskId: "TASK-003",
        plannedEnd: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        status: "in_progress",
      },
    ];

    const signals = computeSignals(tasks, runId);

    expect(signals.totals.scheduleLagCount).toBe(2);
  });

  it("2) Budget overburn detection works correctly", () => {
    const runId = "test-run-2";

    const tasks: TaskNormalized[] = [
      // Task with budget overburn
      {
        ...baseTask,
        taskId: "TASK-001",
        budgetAllocated: 10000,
        budgetSpent: 12000,
      },
      // Task within budget
      {
        ...baseTask,
        taskId: "TASK-002",
        budgetAllocated: 10000,
        budgetSpent: 8000,
      },
      // Task with another overburn
      {
        ...baseTask,
        taskId: "TASK-003",
        budgetAllocated: 5000,
        budgetSpent: 6000,
      },
    ];

    const signals = computeSignals(tasks, runId);

    expect(signals.totals.budgetOverburnCount).toBe(2);
  });

  it("3) Critical path risk detection works correctly", () => {
    const runId = "test-run-3";

    const tasks: TaskNormalized[] = [
      // Blocked task (critical path risk)
      {
        ...baseTask,
        taskId: "TASK-001",
        status: "blocked",
      },
      // Task with blocked dependency
      {
        ...baseTask,
        taskId: "TASK-002",
        dependsOnTaskId: "TASK-001", // Depends on blocked task
        status: "in_progress",
      },
      // Normal task
      {
        ...baseTask,
        taskId: "TASK-003",
        status: "in_progress",
      },
    ];

    const signals = computeSignals(tasks, runId);

    expect(signals.totals.criticalPathRiskCount).toBe(2); // TASK-001 (blocked) + TASK-002 (depends on blocked)
  });

  it("4) Bottlenecks by subcontractor work correctly", () => {
    const runId = "test-run-4";

    const tasks: TaskNormalized[] = [
      // Subcontractor A: 2 blocked, 1 schedule lag
      {
        ...baseTask,
        taskId: "TASK-001",
        subcontractor: "SubA",
        status: "blocked",
      },
      {
        ...baseTask,
        taskId: "TASK-002",
        subcontractor: "SubA",
        status: "blocked",
      },
      {
        ...baseTask,
        taskId: "TASK-003",
        subcontractor: "SubA",
        plannedEnd: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: "in_progress",
      },
      // Subcontractor B: 1 budget overburn
      {
        ...baseTask,
        taskId: "TASK-004",
        subcontractor: "SubB",
        budgetAllocated: 10000,
        budgetSpent: 12000,
      },
    ];

    const signals = computeSignals(tasks, runId);

    expect(signals.topBottlenecksBySubcontractor.length).toBeGreaterThanOrEqual(2);
    expect(signals.topBottlenecksBySubcontractor[0].subcontractor).toBe("SubA");
    expect(signals.topBottlenecksBySubcontractor[0].score).toBeGreaterThanOrEqual(3); // 2 blocked + 1 schedule lag
  });

  it("5) Per-project risk summary works correctly", () => {
    const runId = "test-run-5";

    const tasks: TaskNormalized[] = [
      // Project 1: 2 tasks, 1 schedule lag, 1 budget overburn
      {
        ...baseTask,
        taskId: "TASK-001",
        projectId: "PROJ-001",
        plannedEnd: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: "in_progress",
      },
      {
        ...baseTask,
        taskId: "TASK-002",
        projectId: "PROJ-001",
        budgetAllocated: 10000,
        budgetSpent: 12000,
      },
      // Project 2: 1 task, no issues
      {
        ...baseTask,
        taskId: "TASK-003",
        projectId: "PROJ-002",
      },
    ];

    const signals = computeSignals(tasks, runId);

    expect(signals.perProjectRiskSummary.length).toBe(2);
    const proj1 = signals.perProjectRiskSummary.find((p) => p.projectId === "PROJ-001");
    expect(proj1).toBeDefined();
    expect(proj1?.totalTasks).toBe(2);
    expect(proj1?.scheduleLagCount).toBe(1);
    expect(proj1?.budgetOverburnCount).toBe(1);
  });
});
