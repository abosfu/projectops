import { z } from "zod";

/**
 * Canonical normalized task schema
 */
export const TaskNormalizedSchema = z.object({
  taskId: z.string(),
  projectId: z.string(),
  taskName: z.string(),
  trade: z.string(),
  subcontractor: z.string(),
  plannedStart: z.string(), // ISO format
  plannedEnd: z.string(), // ISO format
  actualStart: z.string().optional(), // ISO format
  progressPct: z.number().min(0).max(100),
  budgetAllocated: z.number(),
  budgetSpent: z.number(),
  dependsOnTaskId: z.string().optional(),
  status: z.enum(["not_started", "in_progress", "blocked", "done", "unknown"]),
  warnings: z.array(z.string()),
});

export type TaskNormalized = z.infer<typeof TaskNormalizedSchema>;

/**
 * Raw CSV row schema (what we expect from input)
 */
export const RawCSVRowSchema = z.object({
  project_id: z.string().optional(),
  task_id: z.string().optional(),
  task_name: z.string().optional(),
  trade: z.string().optional(),
  subcontractor: z.string().optional(),
  planned_start: z.string().optional(),
  planned_end: z.string().optional(),
  actual_start: z.string().optional(),
  progress_pct: z.string().optional(),
  budget_allocated: z.string().optional(),
  budget_spent: z.string().optional(),
  depends_on_task_id: z.string().optional(),
  status: z.string().optional(),
});

export type RawCSVRow = z.infer<typeof RawCSVRowSchema>;

/**
 * Validation result for a single row
 */
export interface RowValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalized?: TaskNormalized;
}
