#!/usr/bin/env node

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

interface Task {
  projectId: string;
  taskId: string;
  taskName: string;
  trade: string;
  subcontractor: string;
  plannedStart: Date;
  plannedEnd: Date;
  actualStart?: Date;
  progressPct: number;
  budgetAllocated: number;
  budgetSpent: number;
  dependsOnTaskId?: string;
  status: "not_started" | "in_progress" | "blocked" | "done" | "unknown";
}

const TRADES = [
  "General",
  "Excavation",
  "Concrete",
  "Framing",
  "Electrical",
  "Plumbing",
  "HVAC",
  "Roofing",
  "Insulation",
  "Drywall",
  "Painting",
  "Flooring",
];

const SUBCONTRACTORS = [
  "ABC Site Prep",
  "XYZ Excavation",
  "Concrete Masters",
  "Frame Builders Inc",
  "Spark Electric",
  "Flow Plumbing Co",
  "Climate Control LLC",
  "Roof Masters",
  "Insulate Pro",
  "Drywall Experts",
  "Color Masters",
  "Floor Pro",
  "Kitchen Specialists",
  "Bathroom Pros",
  "Foundation Fix LLC",
  "Demolition Crew",
  "Survey Co",
  "City Inspector",
];

const TASK_TEMPLATES: Record<string, string[]> = {
  General: ["Site Preparation", "Site Survey", "Demolition", "Kitchen Installation", "Bathroom Installation", "Final Inspection"],
  Excavation: ["Foundation Excavation", "Site Excavation", "Grading"],
  Concrete: ["Foundation Pour", "Foundation Curing", "Foundation Repair", "Slab Pour"],
  Framing: ["Frame First Floor", "Frame Second Floor", "Frame Structure", "Roof Framing", "Frame Addition"],
  Electrical: ["Rough Electrical", "Final Electrical", "Electrical Upgrade", "Panel Installation"],
  Plumbing: ["Rough Plumbing", "Final Plumbing", "Plumbing Upgrade", "Fixture Installation"],
  HVAC: ["HVAC Rough-In", "HVAC Final", "HVAC Installation", "Ductwork"],
  Roofing: ["Roofing Installation", "Roof Repair", "Gutter Installation"],
  Insulation: ["Insulation", "Blown-In Insulation", "Batt Insulation"],
  Drywall: ["Drywall Installation", "Drywall", "Taping and Mudding"],
  Painting: ["Painting", "Interior Painting", "Exterior Painting"],
  Flooring: ["Flooring Installation", "Flooring", "Hardwood Installation", "Tile Installation"],
};

/**
 * Simple seeded random number generator
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }
}

/**
 * Generate a task name for a trade
 */
function generateTaskName(rng: SeededRandom, trade: string): string {
  const templates = TASK_TEMPLATES[trade] || [trade + " Work"];
  return rng.pick(templates);
}

/**
 * Assign subcontractor to trade
 */
function assignSubcontractor(rng: SeededRandom, trade: string): string {
  // Map trades to likely subcontractors
  const tradeMap: Record<string, string[]> = {
    General: ["ABC Site Prep", "Survey Co", "Demolition Crew", "Kitchen Specialists", "Bathroom Pros", "City Inspector"],
    Excavation: ["ABC Site Prep", "XYZ Excavation"],
    Concrete: ["Concrete Masters", "Foundation Fix LLC"],
    Framing: ["Frame Builders Inc"],
    Electrical: ["Spark Electric"],
    Plumbing: ["Flow Plumbing Co"],
    HVAC: ["Climate Control LLC"],
    Roofing: ["Roof Masters"],
    Insulation: ["Insulate Pro"],
    Drywall: ["Drywall Experts"],
    Painting: ["Color Masters"],
    Flooring: ["Floor Pro"],
  };

  const options = tradeMap[trade] || SUBCONTRACTORS;
  return rng.pick(options);
}

/**
 * Generate tasks for a project
 */
function generateProjectTasks(
  rng: SeededRandom,
  projectId: string,
  numTasks: number,
  startDate: Date
): Task[] {
  const tasks: Task[] = [];
  const taskMap = new Map<string, Task>();
  let currentDate = new Date(startDate);

  // Generate initial tasks (no dependencies)
  const initialTasks = Math.min(3, numTasks);
  for (let i = 0; i < initialTasks; i++) {
    const trade = rng.pick(TRADES);
    const taskId = `${projectId}-TASK-${String(i + 1).padStart(3, "0")}`;
    const duration = rng.nextInt(3, 7); // 3-7 days
    const plannedStart = new Date(currentDate);
    const plannedEnd = new Date(currentDate);
    plannedEnd.setDate(plannedEnd.getDate() + duration);

    const task: Task = {
      projectId,
      taskId,
      taskName: generateTaskName(rng, trade),
      trade,
      subcontractor: assignSubcontractor(rng, trade),
      plannedStart,
      plannedEnd,
      progressPct: rng.nextFloat(0, 100),
      budgetAllocated: rng.nextInt(10000, 50000),
      budgetSpent: 0,
      status: "not_started",
    };

    // Some tasks are done or in progress
    if (rng.next() < 0.3) {
      task.status = "done";
      task.progressPct = 100;
      task.actualStart = new Date(plannedStart);
      task.budgetSpent = task.budgetAllocated * rng.nextFloat(0.9, 1.1);
    } else if (rng.next() < 0.4) {
      task.status = "in_progress";
      task.progressPct = rng.nextFloat(20, 90);
      task.actualStart = new Date(plannedStart);
      // Inject some budget overruns
      const spendRate = task.progressPct > 0 ? task.budgetSpent / task.progressPct : 0;
      task.budgetSpent = task.budgetAllocated * (task.progressPct / 100) * rng.nextFloat(0.8, 1.3);
    } else if (rng.next() < 0.1) {
      task.status = "blocked";
    }

    tasks.push(task);
    taskMap.set(taskId, task);
    currentDate = new Date(plannedEnd);
    currentDate.setDate(currentDate.getDate() + 1); // 1 day gap between tasks
  }

  // Generate dependent tasks
  for (let i = initialTasks; i < numTasks; i++) {
    const trade = rng.pick(TRADES);
    const taskId = `${projectId}-TASK-${String(i + 1).padStart(3, "0")}`;
    const duration = rng.nextInt(3, 10);
    
    // Pick a dependency from existing tasks
    const dependency = rng.pick(Array.from(taskMap.values()));
    const plannedStart = new Date(dependency.plannedEnd);
    plannedStart.setDate(plannedStart.getDate() + rng.nextInt(0, 2)); // 0-2 day gap
    const plannedEnd = new Date(plannedStart);
    plannedEnd.setDate(plannedEnd.getDate() + duration);

    const task: Task = {
      projectId,
      taskId,
      taskName: generateTaskName(rng, trade),
      trade,
      subcontractor: assignSubcontractor(rng, trade),
      plannedStart,
      plannedEnd,
      dependsOnTaskId: dependency.taskId,
      progressPct: rng.nextFloat(0, 100),
      budgetAllocated: rng.nextInt(10000, 50000),
      budgetSpent: 0,
      status: "not_started",
    };

    // Some tasks are done or in progress
    if (rng.next() < 0.2) {
      task.status = "done";
      task.progressPct = 100;
      task.actualStart = new Date(plannedStart);
      task.budgetSpent = task.budgetAllocated * rng.nextFloat(0.9, 1.1);
    } else if (rng.next() < 0.3) {
      task.status = "in_progress";
      task.progressPct = rng.nextFloat(20, 90);
      task.actualStart = new Date(plannedStart);
      // Inject some schedule delays (actual start after planned start)
      if (rng.next() < 0.3) {
        const delay = rng.nextInt(1, 5);
        task.actualStart = new Date(plannedStart);
        task.actualStart.setDate(task.actualStart.getDate() + delay);
      }
      // Inject budget overruns
      task.budgetSpent = task.budgetAllocated * (task.progressPct / 100) * rng.nextFloat(0.8, 1.4);
    } else if (rng.next() < 0.1) {
      task.status = "blocked";
    }

    tasks.push(task);
    taskMap.set(taskId, task);
  }

  return tasks;
}

/**
 * Format date as ISO string
 */
function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Convert task to CSV row
 */
function taskToCSVRow(task: Task): string {
  return [
    task.projectId,
    task.taskId,
    task.taskName,
    task.trade,
    task.subcontractor,
    formatDate(task.plannedStart),
    formatDate(task.plannedEnd),
    task.actualStart ? formatDate(task.actualStart) : "",
    Math.round(task.progressPct).toString(),
    Math.round(task.budgetAllocated).toString(),
    Math.round(task.budgetSpent).toString(),
    task.dependsOnTaskId || "",
    task.status,
  ].join(",");
}

/**
 * Main generator function
 */
function generateSampleRun(
  seed: number,
  numProjects: number,
  tasksPerProject: number
): string {
  const rng = new SeededRandom(seed);
  const baseDate = new Date("2024-01-15T08:00:00Z");
  const allTasks: Task[] = [];

  // Generate projects
  for (let p = 1; p <= numProjects; p++) {
    const projectId = `PROJ-${String(p).padStart(3, "0")}`;
    const projectStart = new Date(baseDate);
    projectStart.setDate(projectStart.getDate() + (p - 1) * 14); // Stagger projects by 2 weeks

    const tasks = generateProjectTasks(rng, projectId, tasksPerProject, projectStart);
    allTasks.push(...tasks);
  }

  // Generate CSV
  const header = [
    "project_id",
    "task_id",
    "task_name",
    "trade",
    "subcontractor",
    "planned_start",
    "planned_end",
    "actual_start",
    "progress_pct",
    "budget_allocated",
    "budget_spent",
    "depends_on_task_id",
    "status",
  ].join(",");

  const rows = allTasks.map(taskToCSVRow);
  return [header, ...rows].join("\n");
}

/**
 * CLI entry point
 */
function main() {
  const args = process.argv.slice(2);
  
  let seed = 42;
  let numProjects = 3;
  let tasksPerProject = 25;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--seed" && i + 1 < args.length) {
      seed = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--projects" && i + 1 < args.length) {
      numProjects = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--tasks" && i + 1 < args.length) {
      tasksPerProject = parseInt(args[i + 1], 10);
      i++;
    }
  }

  // Generate CSV
  const csv = generateSampleRun(seed, numProjects, tasksPerProject);

  // Ensure output directory exists
  const outputDir = join(process.cwd(), "data", "generated_inputs");
  mkdirSync(outputDir, { recursive: true });

  // Write file
  const filename = `projectops_tasks_${seed}_${numProjects}p_${tasksPerProject}t.csv`;
  const outputPath = join(outputDir, filename);
  writeFileSync(outputPath, csv, "utf-8");

  console.log(`Generated sample run: ${outputPath}`);
  console.log(`  Seed: ${seed}`);
  console.log(`  Projects: ${numProjects}`);
  console.log(`  Tasks per project: ${tasksPerProject}`);
  console.log(`  Total tasks: ${numProjects * tasksPerProject}`);
}

main();

