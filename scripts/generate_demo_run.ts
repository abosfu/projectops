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
 * Ensures realistic status distribution and budget ranges
 */
function generateProjectTasks(
  rng: SeededRandom,
  projectId: string,
  numTasks: number,
  startDate: Date,
  seedNumber: number
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

    // Budget allocated: $250k-$2.5M per project, distributed across tasks
    // For foundation tasks, use $15k-$60k per task
    const budgetAllocated = rng.nextInt(15000, 60000);
    
    const task: Task = {
      projectId,
      taskId,
      taskName: generateTaskName(rng, trade),
      trade,
      subcontractor: assignSubcontractor(rng, trade),
      plannedStart,
      plannedEnd,
      progressPct: rng.nextFloat(0, 100),
      budgetAllocated,
      budgetSpent: 0,
      status: "not_started",
    };

    // Realistic status distribution: done 20-50%, in_progress 20-45%, not_started 10-35%, blocked 3-15%
    // For foundation tasks, more likely to be done or in_progress
    const statusRand = rng.next();
    if (statusRand < 0.45) {
      task.status = "done";
      task.progressPct = 100;
      task.actualStart = new Date(plannedStart);
      task.budgetSpent = budgetAllocated * rng.nextFloat(0.85, 1.20);
    } else if (statusRand < 0.75) {
      task.status = "in_progress";
      task.progressPct = rng.nextFloat(30, 80);
      task.actualStart = new Date(plannedStart);
      // Inject some delays (30% chance)
      if (rng.next() < 0.3) {
        const delay = rng.nextInt(2, 7);
        task.actualStart.setDate(task.actualStart.getDate() + delay);
      }
      // Budget tracking: spent as allocated * (progress/100) * (0.85-1.20)
      task.budgetSpent = budgetAllocated * (task.progressPct / 100) * rng.nextFloat(0.85, 1.20);
    } else if (statusRand < 0.92) {
      task.status = "not_started";
    } else {
      task.status = "blocked";
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

    const budgetAllocated = rng.nextInt(20000, 80000);
    
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
      budgetAllocated,
      budgetSpent: 0,
      status: "not_started",
    };

    // Realistic status distribution
    const statusRand = rng.next();
    if (statusRand < 0.35) {
      task.status = "done";
      task.progressPct = 100;
      task.actualStart = new Date(plannedStart);
      task.budgetSpent = budgetAllocated * rng.nextFloat(0.85, 1.20);
    } else if (statusRand < 0.65) {
      task.status = "in_progress";
      task.progressPct = rng.nextFloat(20, 85);
      task.actualStart = new Date(plannedStart);
      // Inject delays (30% chance)
      if (rng.next() < 0.3) {
        const delay = rng.nextInt(3, 10);
        task.actualStart.setDate(task.actualStart.getDate() + delay);
      }
      // Budget: spent as allocated * (progress/100) * (0.85-1.20)
      task.budgetSpent = budgetAllocated * (task.progressPct / 100) * rng.nextFloat(0.85, 1.20);
    } else if (statusRand < 0.88) {
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

    const budgetAllocated = rng.nextInt(12000, 50000);
    
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
      budgetAllocated,
      budgetSpent: 0,
      status: "not_started",
    };

    // Realistic status distribution
    const statusRand = rng.next();
    if (statusRand < 0.30) {
      task.status = "done";
      task.progressPct = 100;
      task.actualStart = new Date(plannedStart);
      task.budgetSpent = budgetAllocated * rng.nextFloat(0.85, 1.20);
    } else if (statusRand < 0.60) {
      task.status = "in_progress";
      task.progressPct = rng.nextFloat(15, 75);
      task.actualStart = new Date(plannedStart);
      // Higher chance of delays in MEP (40% chance)
      if (rng.next() < 0.4) {
        const delay = rng.nextInt(2, 8);
        task.actualStart.setDate(task.actualStart.getDate() + delay);
      }
      // Budget: spent as allocated * (progress/100) * (0.85-1.20)
      task.budgetSpent = budgetAllocated * (task.progressPct / 100) * rng.nextFloat(0.85, 1.20);
    } else if (statusRand < 0.87) {
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

    const budgetAllocated = rng.nextInt(10000, 40000);
    
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
      budgetAllocated,
      budgetSpent: 0,
      status: "not_started",
    };

    // Finishing tasks: more likely to be not_started, but still realistic distribution
    const statusRand = rng.next();
    if (statusRand < 0.25) {
      task.status = "done";
      task.progressPct = 100;
      task.actualStart = new Date(plannedStart);
      task.budgetSpent = budgetAllocated * rng.nextFloat(0.85, 1.20);
    } else if (statusRand < 0.50) {
      task.status = "in_progress";
      task.progressPct = rng.nextFloat(10, 50);
      task.actualStart = new Date(plannedStart);
      if (rng.next() < 0.3) {
        const delay = rng.nextInt(1, 5);
        task.actualStart.setDate(task.actualStart.getDate() + delay);
      }
      task.budgetSpent = budgetAllocated * (task.progressPct / 100) * rng.nextFloat(0.85, 1.20);
    } else if (statusRand < 0.90) {
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
 * Adjust tasks to ensure risk metrics fall within realistic ranges
 * Behind Schedule: 10-45%, Critical Path: 8-35%, Overburn: 5-25%, Overrun: 0-12%
 */
function adjustTasksForRealisticMetrics(tasks: Task[], rng: SeededRandom, baseDate: Date): void {
  const totalTasks = tasks.length;
  if (totalTasks === 0) return;

  // Target percentages (will be adjusted within ranges)
  const behindScheduleTarget = rng.nextFloat(0.10, 0.45);
  const criticalPathTarget = rng.nextFloat(0.08, 0.35);
  const overburnTarget = rng.nextFloat(0.05, 0.25);
  
  // Calculate target counts
  const behindScheduleTargetCount = Math.round(totalTasks * behindScheduleTarget);
  const criticalPathTargetCount = Math.round(totalTasks * criticalPathTarget);
  const overburnTargetCount = Math.round(totalTasks * overburnTarget);
  
  // Ensure we don't exceed total tasks
  const maxRiskTasks = Math.min(
    behindScheduleTargetCount + criticalPathTargetCount + overburnTargetCount,
    Math.floor(totalTasks * 0.85) // Leave at least 15% on track
  );
  
  // Adjust targets proportionally if needed
  const totalTarget = behindScheduleTargetCount + criticalPathTargetCount + overburnTargetCount;
  if (totalTarget > maxRiskTasks) {
    const scale = maxRiskTasks / totalTarget;
    const adjustedBehind = Math.round(behindScheduleTargetCount * scale);
    const adjustedCritical = Math.round(criticalPathTargetCount * scale);
    const adjustedOverburn = Math.round(overburnTargetCount * scale);
    
    // Mark tasks to be behind schedule
    let behindCount = 0;
    for (const task of tasks) {
      if (behindCount >= adjustedBehind) break;
      if (task.status !== "done" && task.status !== "blocked") {
        // Make task behind schedule by adjusting dates
        const delay = rng.nextInt(5, 15);
        task.actualStart = new Date(task.plannedStart);
        task.actualStart.setDate(task.actualStart.getDate() + delay);
        task.progressPct = Math.max(0, task.progressPct - rng.nextInt(10, 30));
        behindCount++;
      }
    }
    
    // Mark tasks for critical path risk (blocked or dependencies)
    let criticalCount = 0;
    for (const task of tasks) {
      if (criticalCount >= adjustedCritical) break;
      if (task.status !== "done" && !task.actualStart) {
        task.status = "blocked";
        criticalCount++;
      }
    }
    
    // Mark tasks for budget overburn
    let overburnCount = 0;
    for (const task of tasks) {
      if (overburnCount >= adjustedOverburn) break;
      if (task.status === "in_progress" || task.status === "done") {
        // Increase spent beyond allocated
        const overrunFactor = rng.nextFloat(1.15, 1.40);
        task.budgetSpent = task.budgetAllocated * (task.progressPct / 100) * overrunFactor;
        overburnCount++;
      }
    }
  } else {
    // Similar logic but with original targets
    let behindCount = 0;
    for (const task of tasks) {
      if (behindCount >= behindScheduleTargetCount) break;
      if (task.status !== "done" && task.status !== "blocked") {
        const delay = rng.nextInt(5, 15);
        task.actualStart = new Date(task.plannedStart);
        task.actualStart.setDate(task.actualStart.getDate() + delay);
        task.progressPct = Math.max(0, task.progressPct - rng.nextInt(10, 30));
        behindCount++;
      }
    }
    
    let criticalCount = 0;
    for (const task of tasks) {
      if (criticalCount >= criticalPathTargetCount) break;
      if (task.status !== "done" && !task.actualStart) {
        task.status = "blocked";
        criticalCount++;
      }
    }
    
    let overburnCount = 0;
    for (const task of tasks) {
      if (overburnCount >= overburnTargetCount) break;
      if (task.status === "in_progress" || task.status === "done") {
        const overrunFactor = rng.nextFloat(1.15, 1.40);
        task.budgetSpent = task.budgetAllocated * (task.progressPct / 100) * overrunFactor;
        overburnCount++;
      }
    }
  }
  
  // Ensure projected overrun is not always $0
  // Adjust some projects to have actual overruns
  const projects = new Set(tasks.map(t => t.projectId));
  const projectsWithOverrun = Math.max(1, Math.floor(projects.size * rng.nextFloat(0.3, 0.7)));
  let overrunProjects = 0;
  
  for (const projectId of projects) {
    if (overrunProjects >= projectsWithOverrun) break;
    const projectTasks = tasks.filter(t => t.projectId === projectId);
    const totalAllocated = projectTasks.reduce((sum, t) => sum + t.budgetAllocated, 0);
    const totalSpent = projectTasks.reduce((sum, t) => sum + t.budgetSpent, 0);
    
    // If not already overrunning, adjust some tasks
    if (totalSpent <= totalAllocated) {
      const overrunAmount = totalAllocated * rng.nextFloat(0.02, 0.12); // 2-12% overrun
      const adjustmentFactor = (totalAllocated + overrunAmount) / totalSpent;
      
      // Distribute overrun across in-progress and done tasks
      const activeTasks = projectTasks.filter(t => t.status === "in_progress" || t.status === "done");
      if (activeTasks.length > 0) {
        activeTasks.forEach(task => {
          task.budgetSpent = task.budgetSpent * adjustmentFactor;
        });
      }
    }
    overrunProjects++;
  }
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
 * Using date-based seed for stability
 */
export const DEFAULT_DEMO_SEED = "20260215";

/**
 * Hash a string seed to a number for SeededRandom
 * Simple hash function for deterministic conversion
 */
export function hashSeedToNumber(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Ensure positive number
  return Math.abs(hash) || 1;
}

/**
 * Generate demo run CSV
 * @param seed String seed (will be hashed to number) or number seed
 */
export function generateDemoRun(seed: string | number = DEFAULT_DEMO_SEED): string {
  const seedNumber = typeof seed === "string" ? hashSeedToNumber(seed) : seed;
  const rng = new SeededRandom(seedNumber);
  // Use a fixed base date for determinism (2024-01-01)
  // This ensures same seed always produces same dates
  const baseDate = new Date("2024-01-01T08:00:00Z");
  const allTasks: Task[] = [];

  // Generate 4-8 projects with realistic task counts (total 80-140 tasks)
  const numProjects = rng.nextInt(4, 8);
  const totalTasksTarget = rng.nextInt(80, 140);
  const tasksPerProject = Math.floor(totalTasksTarget / numProjects);
  const remainder = totalTasksTarget % numProjects;
  
  const projectConfigs: Array<{ id: string; name: string; tasks: number }> = [];
  const projectNames = [
    "Downtown Office Complex",
    "Residential Tower",
    "Retail Plaza",
    "Industrial Warehouse",
    "Mixed-Use Development",
    "Healthcare Facility",
  ];
  
  for (let i = 0; i < numProjects; i++) {
    const tasks = tasksPerProject + (i < remainder ? 1 : 0);
    projectConfigs.push({
      id: `PROJ-${String(i + 1).padStart(3, "0")}`,
      name: projectNames[i] || `Project ${i + 1}`,
      tasks: tasks,
    });
  }

  for (const config of projectConfigs) {
    const projectStart = new Date(baseDate);
    projectStart.setDate(projectStart.getDate() + (parseInt(config.id.slice(-1)) - 1) * 21); // Stagger by 3 weeks

    const tasks = generateProjectTasks(rng, config.id, config.tasks, projectStart, seedNumber);
    allTasks.push(...tasks);
  }

  // Post-process to ensure realistic risk metric ranges
  // This adjusts tasks to ensure metrics fall within believable ranges
  adjustTasksForRealisticMetrics(allTasks, rng, baseDate);

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

