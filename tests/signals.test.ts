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
      // Task with progress gap (expected progress > actual progress by threshold)
      {
        ...baseTask,
        taskId: "TASK-002",
        plannedStart: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
        plannedEnd: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
        progressPct: 30, // Actual progress is 30%, but expected is ~50% (10 days elapsed / 20 days total)
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
    const snapshotTime = new Date(now.getTime());

    const tasks: TaskNormalized[] = [
      // Task with budget overburn (spent 12000, but expected only 5000 at 50% progress)
      // Must NOT be behind schedule, so set progressPct to match expected progress
      {
        ...baseTask,
        taskId: "TASK-001",
        plannedStart: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        plannedEnd: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days from now (30 day total)
        budgetAllocated: 10000,
        budgetSpent: 12000,
        progressPct: 33, // Expected progress = 10/30 = 33%, actual = 33%, so no schedule lag. Expected spend = 3300, but spent 12000
        status: "in_progress",
      },
      // Task within budget (spent 8000, expected 8000 at 80% progress)
      {
        ...baseTask,
        taskId: "TASK-002",
        plannedStart: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
        plannedEnd: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now (10 day total)
        budgetAllocated: 10000,
        budgetSpent: 8000,
        progressPct: 80, // Expected progress = 8/10 = 80%, actual = 80%, so no schedule lag. Expected spend = 8000, spent 8000, so no overburn
        status: "in_progress",
      },
      // Task with another overburn (spent 6000, but expected only 2500 at 50% progress)
      {
        ...baseTask,
        taskId: "TASK-003",
        plannedStart: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        plannedEnd: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days from now (30 day total)
        budgetAllocated: 5000,
        budgetSpent: 6000,
        progressPct: 33, // Expected progress = 10/30 = 33%, actual = 33%, so no schedule lag. Expected spend = 1650, but spent 6000
        status: "in_progress",
      },
    ];

    const signals = computeSignals(tasks, runId, snapshotTime);

    expect(signals.totals.budgetOverburnCount).toBe(2);
  });

  it("3) Critical path risk detection works correctly", () => {
    const runId = "test-run-3";
    const snapshotTime = new Date(now.getTime());

    const tasks: TaskNormalized[] = [
      // Blocked task (critical path risk)
      // Must NOT be behind schedule, so set plannedEnd far in future and progressPct to match expected
      {
        ...baseTask,
        taskId: "TASK-001",
        plannedStart: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        plannedEnd: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days from now
        progressPct: 33, // Expected ~33% (10 days elapsed / 30 days total), so no schedule lag
        status: "blocked",
      },
      // Task with blocked dependency
      {
        ...baseTask,
        taskId: "TASK-002",
        plannedStart: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        plannedEnd: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        dependsOnTaskId: "TASK-001", // Depends on blocked task
        progressPct: 33, // Expected ~33%, so no schedule lag
        status: "in_progress",
      },
      // Normal task
      {
        ...baseTask,
        taskId: "TASK-003",
        plannedStart: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        plannedEnd: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        progressPct: 33, // Expected ~33%, so no schedule lag
        status: "in_progress",
      },
    ];

    const signals = computeSignals(tasks, runId, snapshotTime);

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
    const snapshotTime = new Date(now.getTime());

    const tasks: TaskNormalized[] = [
      // Project 1: 2 tasks, 1 schedule lag, 1 budget overburn
      // TASK-001: Past planned end date → schedule lag
      {
        ...baseTask,
        taskId: "TASK-001",
        projectId: "PROJ-001",
        plannedStart: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        plannedEnd: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        status: "in_progress",
      },
      // TASK-002: Budget overburn, but NOT behind schedule
      {
        ...baseTask,
        taskId: "TASK-002",
        projectId: "PROJ-001",
        plannedStart: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        plannedEnd: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days from now
        budgetAllocated: 10000,
        budgetSpent: 12000,
        progressPct: 50, // Expected spend = 5000, but spent 12000
        status: "in_progress",
      },
      // Project 2: 1 task, no issues
      {
        ...baseTask,
        taskId: "TASK-003",
        projectId: "PROJ-002",
        plannedStart: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        plannedEnd: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        progressPct: 33, // Expected ~33%, so no schedule lag
        status: "in_progress",
      },
    ];

    const signals = computeSignals(tasks, runId, snapshotTime);

    expect(signals.perProjectRiskSummary.length).toBe(2);
    const proj1 = signals.perProjectRiskSummary.find((p) => p.projectId === "PROJ-001");
    expect(proj1).toBeDefined();
    expect(proj1?.totalTasks).toBe(2);
    expect(proj1?.scheduleLagCount).toBe(1);
    expect(proj1?.budgetOverburnCount).toBe(1);
  });

  it("6) All percentages are clamped to 0-100", () => {
    const runId = "test-run-6";
    const tasks: TaskNormalized[] = [
      ...Array(10).fill(null).map((_, i) => ({
        ...baseTask,
        taskId: `TASK-${i + 1}`,
        budgetAllocated: 10000,
        budgetSpent: 15000, // 50% overrun
      })),
    ];

    const signals = computeSignals(tasks, runId);
    
    // Check per-project projected overrun is clamped
    signals.perProjectRiskSummary.forEach((project) => {
      expect(project.projectedOverrunPct).toBeGreaterThanOrEqual(0);
      expect(project.projectedOverrunPct).toBeLessThanOrEqual(100);
      expect(project.healthScore).toBeGreaterThanOrEqual(0);
      expect(project.healthScore).toBeLessThanOrEqual(100);
    });

    // Check global health score
    expect(signals.globalHealthScore).toBeGreaterThanOrEqual(0);
    expect(signals.globalHealthScore).toBeLessThanOrEqual(100);
  });

  it("7) Status counts sum to total tasks", () => {
    const runId = "test-run-7";
    const tasks: TaskNormalized[] = [
      { ...baseTask, taskId: "TASK-001", status: "done" },
      { ...baseTask, taskId: "TASK-002", status: "in_progress" },
      { ...baseTask, taskId: "TASK-003", status: "not_started" },
      { ...baseTask, taskId: "TASK-004", status: "blocked" },
    ];

    const signals = computeSignals(tasks, runId);
    
    const statusSum = Object.values(signals.byStatus).reduce((a, b) => a + b, 0);
    expect(statusSum).toBe(tasks.length);
    expect(statusSum).toBe(signals.totals.tasks);
  });

  it("8) On Track percentage is never negative", () => {
    const runId = "test-run-8";
    const tasks: TaskNormalized[] = Array(100).fill(null).map((_, i) => ({
      ...baseTask,
      taskId: `TASK-${i + 1}`,
      status: i < 50 ? "done" : "in_progress",
    }));

    const signals = computeSignals(tasks, runId);
    
    const behindPct = (signals.totals.scheduleLagCount / signals.totals.tasks) * 100;
    const criticalPct = (signals.totals.criticalPathRiskCount / signals.totals.tasks) * 100;
    const overburnPct = (signals.totals.budgetOverburnCount / signals.totals.tasks) * 100;
    const onTrackPct = 100 - behindPct - criticalPct - overburnPct;
    
    expect(onTrackPct).toBeGreaterThanOrEqual(0);
    expect(onTrackPct).toBeLessThanOrEqual(100);
  });

  it("9) Projected overrun is not always zero", () => {
    const runId = "test-run-9";
    const tasks: TaskNormalized[] = [
      {
        ...baseTask,
        taskId: "TASK-001",
        budgetAllocated: 100000,
        budgetSpent: 110000, // Already over
        progressPct: 80,
        status: "in_progress",
      },
      {
        ...baseTask,
        taskId: "TASK-002",
        budgetAllocated: 100000,
        budgetSpent: 60000, // Spent 60k at 50% = 120k projected
        progressPct: 50,
        status: "in_progress",
      },
    ];

    const signals = computeSignals(tasks, runId);
    
    // At least one project should have non-zero projected overrun
    const hasOverrun = signals.perProjectRiskSummary.some(
      (p) => p.projectedOverrunPct > 0
    );
    expect(hasOverrun).toBe(true);
  });

  it("10) Health scores are varied across projects", () => {
    const runId = "test-run-10";
    const tasks: TaskNormalized[] = [
      // Project 1: Many issues
      {
        ...baseTask,
        taskId: "TASK-001",
        projectId: "PROJ-001",
        plannedEnd: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: "in_progress",
      },
      {
        ...baseTask,
        taskId: "TASK-002",
        projectId: "PROJ-001",
        status: "blocked",
      },
      {
        ...baseTask,
        taskId: "TASK-003",
        projectId: "PROJ-001",
        budgetAllocated: 10000,
        budgetSpent: 12000,
      },
      // Project 2: Few issues
      {
        ...baseTask,
        taskId: "TASK-004",
        projectId: "PROJ-002",
        status: "done",
      },
      {
        ...baseTask,
        taskId: "TASK-005",
        projectId: "PROJ-002",
        status: "in_progress",
      },
    ];

    const signals = computeSignals(tasks, runId);
    
    expect(signals.perProjectRiskSummary.length).toBe(2);
    const proj1 = signals.perProjectRiskSummary.find((p) => p.projectId === "PROJ-001");
    const proj2 = signals.perProjectRiskSummary.find((p) => p.projectId === "PROJ-002");
    
    expect(proj1).toBeDefined();
    expect(proj2).toBeDefined();
    
    // Project 1 should have lower health score than Project 2
    if (proj1 && proj2) {
      expect(proj1.healthScore).toBeLessThan(proj2.healthScore);
    }
  });

  it("11) Handles zero tasks gracefully", () => {
    const runId = "test-run-11";
    const tasks: TaskNormalized[] = [];

    const signals = computeSignals(tasks, runId);
    
    expect(signals.totals.tasks).toBe(0);
    expect(signals.totals.scheduleLagCount).toBe(0);
    expect(signals.totals.criticalPathRiskCount).toBe(0);
    expect(signals.totals.budgetOverburnCount).toBe(0);
    expect(signals.globalHealthScore).toBe(100);
    expect(signals.perProjectRiskSummary.length).toBe(0);
  });
});
