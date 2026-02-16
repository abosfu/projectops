/**
 * Generate a realistic demo run for construction projects
 * Creates a weekly snapshot CSV with 3 projects, 20-40 tasks each
 */

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
  "concrete",
  "framing",
  "electrical",
  "plumbing",
  "hvac",
  "drywall",
  "roofing",
  "inspections",
];

const SUBCONTRACTORS = [
  "Premier Concrete Co",
  "Steel Frame Builders",
  "Bright Electric LLC",
  "Flow Plumbing Services",
  "Climate Masters HVAC",
  "Smooth Drywall Inc",
  "Peak Roofing Systems",
  "City Building Inspections",
  "Quality Assurance Group",
  "Metro Construction Services",
];

const TASK_TEMPLATES: Record<string, string[]> = {
  concrete: [
    "Foundation Excavation",
    "Foundation Pour",
    "Foundation Curing",
    "Slab Pour",
    "Concrete Finishing",
    "Driveway Pour",
  ],
  framing: [
    "Frame First Floor",
    "Frame Second Floor",
    "Roof Framing",
    "Wall Framing",
    "Structural Beams",
    "Frame Addition",
  ],
  electrical: [
    "Rough Electrical",
    "Panel Installation",
    "Final Electrical",
    "Electrical Inspection",
    "Lighting Installation",
    "Outlet Installation",
  ],
  plumbing: [
    "Rough Plumbing",
    "Fixture Installation",
    "Water Line Installation",
    "Sewer Line Installation",
    "Final Plumbing",
    "Plumbing Inspection",
  ],
  hvac: [
    "HVAC Rough-In",
    "Ductwork Installation",
    "HVAC Unit Installation",
    "HVAC Final",
    "Ventilation System",
    "HVAC Inspection",
  ],
  drywall: [
    "Drywall Installation",
    "Taping and Mudding",
    "Drywall Sanding",
    "Texture Application",
    "Drywall Finishing",
  ],
  roofing: [
    "Roof Decking",
    "Roofing Installation",
    "Gutter Installation",
    "Roof Inspection",
    "Roof Repair",
  ],
  inspections: [
    "Foundation Inspection",
    "Framing Inspection",
    "Electrical Inspection",
    "Plumbing Inspection",
    "Final Inspection",
    "Occupancy Inspection",
  ],
};

import { SeededRandom } from "../packages/core/src/seededRandom.js";

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
  const tradeMap: Record<string, string[]> = {
    concrete: ["Premier Concrete Co"],
    framing: ["Steel Frame Builders"],
    electrical: ["Bright Electric LLC"],
    plumbing: ["Flow Plumbing Services"],
    hvac: ["Climate Masters HVAC"],
    drywall: ["Smooth Drywall Inc"],
    roofing: ["Peak Roofing Systems"],
    inspections: ["City Building Inspections", "Quality Assurance Group"],
  };

  const options = tradeMap[trade] || SUBCONTRACTORS;
  return rng.pick(options);
}

/**
 * Generate realistic project tasks with dependencies forming a DAG
 */
function generateProjectTasks(
  rng: SeededRandom,
  projectId: string,
  numTasks: number,
  startDate: Date
): Task[] {
  const tasks: Task[] = [];
  const taskMap = new Map<string, Task>();
  const taskIds: string[] = [];
  let currentDate = new Date(startDate);

  // Phase 1: Foundation and early work (no dependencies)
  const foundationTasks = Math.min(5, Math.floor(numTasks * 0.15));
  for (let i = 0; i < foundationTasks; i++) {
    const trade = rng.pick(["concrete", "inspections"]);
    const taskId = `${projectId}-T${String(i + 1).padStart(3, "0")}`;
    const duration = rng.nextInt(3, 7);
    const plannedStart = new Date(currentDate);
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
      progressPct: rng.nextFloat(0, 100),
      budgetAllocated: rng.nextInt(15000, 60000),
      budgetSpent: 0,
      status: "not_started",
    };

    // Some foundation tasks are done
    if (rng.next() < 0.4) {
      task.status = "done";
      task.progressPct = 100;
      task.actualStart = new Date(plannedStart);
      task.budgetSpent = task.budgetAllocated * rng.nextFloat(0.95, 1.05);
    } else if (rng.next() < 0.3) {
      task.status = "in_progress";
      task.progressPct = rng.nextFloat(30, 80);
      task.actualStart = new Date(plannedStart);
      // Inject some delays
      if (rng.next() < 0.4) {
        const delay = rng.nextInt(2, 7);
        task.actualStart.setDate(task.actualStart.getDate() + delay);
      }
      // Budget tracking
      task.budgetSpent = task.budgetAllocated * (task.progressPct / 100) * rng.nextFloat(0.9, 1.2);
    }

    tasks.push(task);
    taskMap.set(taskId, task);
    taskIds.push(taskId);
    currentDate = new Date(plannedEnd);
    currentDate.setDate(currentDate.getDate() + rng.nextInt(0, 2));
  }

  // Phase 2: Framing (depends on foundation)
  const framingTasks = Math.min(8, Math.floor(numTasks * 0.25));
  const foundationDeps = tasks.filter((t) => t.trade === "concrete" && t.status === "done");
  for (let i = 0; i < framingTasks; i++) {
    const taskId = `${projectId}-T${String(foundationTasks + i + 1).padStart(3, "0")}`;
    const duration = rng.nextInt(4, 10);
    
    // Pick a foundation task as dependency
    const dependency = foundationDeps.length > 0 
      ? rng.pick(foundationDeps)
      : rng.pick(tasks.slice(0, foundationTasks));
    
    const plannedStart = new Date(dependency.plannedEnd);
    plannedStart.setDate(plannedStart.getDate() + rng.nextInt(1, 3));
    const plannedEnd = new Date(plannedStart);
    plannedEnd.setDate(plannedEnd.getDate() + duration);

    const task: Task = {
      projectId,
      taskId,
      taskName: generateTaskName(rng, "framing"),
      trade: "framing",
      subcontractor: assignSubcontractor(rng, "framing"),
      plannedStart,
      plannedEnd,
      dependsOnTaskId: dependency.taskId,
      progressPct: rng.nextFloat(0, 100),
      budgetAllocated: rng.nextInt(20000, 80000),
      budgetSpent: 0,
      status: "not_started",
    };

    // Status distribution
    const statusRand = rng.next();
    if (statusRand < 0.3) {
      task.status = "done";
      task.progressPct = 100;
      task.actualStart = new Date(plannedStart);
      task.budgetSpent = task.budgetAllocated * rng.nextFloat(0.9, 1.1);
    } else if (statusRand < 0.5) {
      task.status = "in_progress";
      task.progressPct = rng.nextFloat(20, 85);
      task.actualStart = new Date(plannedStart);
      // Inject delays (30% chance)
      if (rng.next() < 0.3) {
        const delay = rng.nextInt(3, 10);
        task.actualStart.setDate(task.actualStart.getDate() + delay);
      }
      // Budget overruns (40% chance)
      const overrunFactor = rng.next() < 0.4 ? rng.nextFloat(1.1, 1.4) : rng.nextFloat(0.85, 1.1);
      task.budgetSpent = task.budgetAllocated * (task.progressPct / 100) * overrunFactor;
    } else if (statusRand < 0.7) {
      task.status = "not_started";
    } else {
      task.status = "blocked";
    }

    tasks.push(task);
    taskMap.set(taskId, task);
    taskIds.push(taskId);
  }

  // Phase 3: MEP (Mechanical, Electrical, Plumbing) - depends on framing
  const mepTasks = Math.min(12, Math.floor(numTasks * 0.35));
  const framingDeps = tasks.filter((t) => t.trade === "framing");
  for (let i = 0; i < mepTasks; i++) {
    const taskId = `${projectId}-T${String(foundationTasks + framingTasks + i + 1).padStart(3, "0")}`;
    const duration = rng.nextInt(3, 8);
    
    // Pick a framing task as dependency
    const dependency = framingDeps.length > 0 
      ? rng.pick(framingDeps)
      : rng.pick(tasks.slice(foundationTasks, foundationTasks + framingTasks));
    
    const plannedStart = new Date(dependency.plannedEnd);
    plannedStart.setDate(plannedStart.getDate() + rng.nextInt(0, 2));
    const plannedEnd = new Date(plannedStart);
    plannedEnd.setDate(plannedEnd.getDate() + duration);

    // Distribute across MEP trades
    const mepTrades = ["electrical", "plumbing", "hvac"];
    const trade = rng.pick(mepTrades);

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
      budgetAllocated: rng.nextInt(12000, 50000),
      budgetSpent: 0,
      status: "not_started",
    };

    // Status with realistic patterns
    const statusRand = rng.next();
    if (statusRand < 0.25) {
      task.status = "done";
      task.progressPct = 100;
      task.actualStart = new Date(plannedStart);
      task.budgetSpent = task.budgetAllocated * rng.nextFloat(0.92, 1.08);
    } else if (statusRand < 0.5) {
      task.status = "in_progress";
      task.progressPct = rng.nextFloat(15, 75);
      task.actualStart = new Date(plannedStart);
      // Higher chance of delays in MEP
      if (rng.next() < 0.45) {
        const delay = rng.nextInt(2, 8);
        task.actualStart.setDate(task.actualStart.getDate() + delay);
      }
      // Budget overruns more common
      const overrunFactor = rng.next() < 0.5 ? rng.nextFloat(1.15, 1.5) : rng.nextFloat(0.9, 1.1);
      task.budgetSpent = task.budgetAllocated * (task.progressPct / 100) * overrunFactor;
    } else if (statusRand < 0.75) {
      task.status = "not_started";
    } else {
      task.status = "blocked";
    }

    tasks.push(task);
    taskMap.set(taskId, task);
    taskIds.push(taskId);
  }

  // Phase 4: Drywall and finishing - depends on MEP
  const remainingTasks = numTasks - tasks.length;
  const mepDeps = tasks.filter((t) => ["electrical", "plumbing", "hvac"].includes(t.trade));
  for (let i = 0; i < remainingTasks; i++) {
    const taskId = `${projectId}-T${String(tasks.length + 1).padStart(3, "0")}`;
    const duration = rng.nextInt(2, 6);
    
    // Pick a MEP task as dependency
    const dependency = mepDeps.length > 0 
      ? rng.pick(mepDeps)
      : rng.pick(tasks.slice(Math.max(0, tasks.length - 5)));
    
    const plannedStart = new Date(dependency.plannedEnd);
    plannedStart.setDate(plannedStart.getDate() + rng.nextInt(0, 2));
    const plannedEnd = new Date(plannedStart);
    plannedEnd.setDate(plannedEnd.getDate() + duration);

    // Finishing trades
    const finishingTrades = ["drywall", "roofing", "inspections"];
    const trade = rng.pick(finishingTrades);

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
      budgetAllocated: rng.nextInt(10000, 40000),
      budgetSpent: 0,
      status: "not_started",
    };

    // Most finishing tasks are not started yet
    const statusRand = rng.next();
    if (statusRand < 0.15) {
      task.status = "done";
      task.progressPct = 100;
      task.actualStart = new Date(plannedStart);
      task.budgetSpent = task.budgetAllocated * rng.nextFloat(0.95, 1.05);
    } else if (statusRand < 0.3) {
      task.status = "in_progress";
      task.progressPct = rng.nextFloat(10, 50);
      task.actualStart = new Date(plannedStart);
      if (rng.next() < 0.3) {
        const delay = rng.nextInt(1, 5);
        task.actualStart.setDate(task.actualStart.getDate() + delay);
      }
      task.budgetSpent = task.budgetAllocated * (task.progressPct / 100) * rng.nextFloat(0.9, 1.15);
    } else if (statusRand < 0.85) {
      task.status = "not_started";
    } else {
      task.status = "blocked";
    }

    tasks.push(task);
    taskMap.set(taskId, task);
    taskIds.push(taskId);
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
 * Default seed for deterministic demo runs
 */
export const DEFAULT_DEMO_SEED = 42;

/**
 * Generate demo run CSV
 */
export function generateDemoRun(seed: number = DEFAULT_DEMO_SEED): string {
  const rng = new SeededRandom(seed);
  // Use a fixed base date for determinism (2024-01-01)
  // This ensures same seed always produces same dates
  const baseDate = new Date("2024-01-01T08:00:00Z");
  const allTasks: Task[] = [];

  // Generate 3 projects with 20-40 tasks each
  const projectConfigs = [
    { id: "PROJ-001", name: "Downtown Office Complex", tasks: rng.nextInt(20, 30) },
    { id: "PROJ-002", name: "Residential Tower", tasks: rng.nextInt(25, 35) },
    { id: "PROJ-003", name: "Retail Plaza", tasks: rng.nextInt(20, 40) },
  ];

  for (const config of projectConfigs) {
    const projectStart = new Date(baseDate);
    projectStart.setDate(projectStart.getDate() + (parseInt(config.id.slice(-1)) - 1) * 21); // Stagger by 3 weeks

    const tasks = generateProjectTasks(rng, config.id, config.tasks, projectStart);
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

