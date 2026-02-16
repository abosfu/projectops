import { RawCSVRow, TaskNormalized, RowValidationResult } from "./schema.js";

/**
 * Normalize status value
 */
function normalizeStatus(status: string | undefined): "not_started" | "in_progress" | "blocked" | "done" | "unknown" {
  if (!status) return "unknown";
  const normalized = status.trim().toLowerCase().replace(/[_\s-]/g, "_");
  
  if (normalized === "not_started" || normalized === "notstarted" || normalized === "pending") return "not_started";
  if (normalized === "in_progress" || normalized === "inprogress" || normalized === "active" || normalized === "working") return "in_progress";
  if (normalized === "blocked" || normalized === "stuck" || normalized === "waiting") return "blocked";
  if (normalized === "done" || normalized === "completed" || normalized === "finished" || normalized === "closed") return "done";
  
  return "unknown";
}

/**
 * Parse number with validation
 */
function parseNumber(value: string | undefined, fieldName: string): { value: number; warning?: string } {
  if (!value || value.trim() === "") {
    return { value: 0, warning: `Missing ${fieldName}, defaulting to 0` };
  }
  
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    throw new Error(`Invalid number for ${fieldName}: ${value}`);
  }
  
  return { value: parsed };
}

/**
 * Parse percentage with clamping
 */
function parseProgressPct(value: string | undefined): { value: number; warning?: string } {
  if (!value || value.trim() === "") {
    return { value: 0, warning: "Missing progress_pct, defaulting to 0" };
  }
  
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    return { value: 0, warning: `Invalid progress_pct: ${value}, defaulting to 0` };
  }
  
  if (parsed < 0) {
    return { value: 0, warning: `progress_pct ${parsed} is below 0, clamped to 0` };
  }
  if (parsed > 100) {
    return { value: 100, warning: `progress_pct ${parsed} is above 100, clamped to 100` };
  }
  
  return { value: parsed };
}

/**
 * Parse ISO date string
 */
function parseDate(value: string | undefined, fieldName: string): Date {
  if (!value || value.trim() === "") {
    throw new Error(`Missing required field: ${fieldName}`);
  }
  
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format for ${fieldName}: ${value}`);
  }
  
  return date;
}

/**
 * Validate and normalize a single CSV row
 */
export function validateRow(row: RawCSVRow, rowNumber: number): RowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    // Hard fail: required fields
    if (!row.project_id || row.project_id.trim() === "") {
      errors.push("Missing required field: project_id");
    }
    if (!row.task_id || row.task_id.trim() === "") {
      errors.push("Missing required field: task_id");
    }
    
    let plannedStart: Date;
    let plannedEnd: Date;
    
    try {
      plannedStart = parseDate(row.planned_start, "planned_start");
    } catch (e) {
      errors.push(`Missing or invalid planned_start: ${e instanceof Error ? e.message : String(e)}`);
      return { isValid: false, errors, warnings };
    }
    
    try {
      plannedEnd = parseDate(row.planned_end, "planned_end");
    } catch (e) {
      errors.push(`Missing or invalid planned_end: ${e instanceof Error ? e.message : String(e)}`);
      return { isValid: false, errors, warnings };
    }
    
    // Validate planned_end >= planned_start
    if (plannedEnd < plannedStart) {
      errors.push(`planned_end (${row.planned_end}) must be >= planned_start (${row.planned_start})`);
      return { isValid: false, errors, warnings };
    }
    
    // Soft warn: optional fields with defaults
    const trade = row.trade?.trim() || "unknown";
    if (!row.trade || row.trade.trim() === "") {
      warnings.push("Missing trade, defaulting to 'unknown'");
    }
    
    const subcontractor = row.subcontractor?.trim() || "unknown";
    if (!row.subcontractor || row.subcontractor.trim() === "") {
      warnings.push("Missing subcontractor, defaulting to 'unknown'");
    }
    
    const status = normalizeStatus(row.status);
    if (status === "unknown" && row.status) {
      warnings.push(`Unknown status value: ${row.status}, mapped to 'unknown'`);
    }
    
    // Parse progress percentage
    const progressResult = parseProgressPct(row.progress_pct);
    if (progressResult.warning) {
      warnings.push(progressResult.warning);
    }
    
    // Parse budget fields
    const budgetAllocatedResult = parseNumber(row.budget_allocated, "budget_allocated");
    if (budgetAllocatedResult.warning) {
      warnings.push(budgetAllocatedResult.warning);
    }
    
    const budgetSpentResult = parseNumber(row.budget_spent, "budget_spent");
    if (budgetSpentResult.warning) {
      warnings.push(budgetSpentResult.warning);
    }
    
    // Parse optional actual_start
    let actualStart: string | undefined;
    if (row.actual_start && row.actual_start.trim() !== "") {
      try {
        const actualStartDate = parseDate(row.actual_start, "actual_start");
        actualStart = actualStartDate.toISOString();
      } catch (e) {
        warnings.push(`Invalid actual_start date: ${e instanceof Error ? e.message : String(e)}, ignoring`);
      }
    }
    
    // Warn if progress_pct > 0 but actual_start is missing
    if (progressResult.value > 0 && !actualStart) {
      warnings.push(`Task has progress (${progressResult.value}%) but actual_start is missing; schedule lag detection may be less accurate`);
    }
    
    // Build normalized task
    const normalized: TaskNormalized = {
      taskId: row.task_id!.trim(),
      projectId: row.project_id!.trim(),
      taskName: row.task_name?.trim() || `Task ${row.task_id}`,
      trade,
      subcontractor,
      plannedStart: plannedStart.toISOString(),
      plannedEnd: plannedEnd.toISOString(),
      actualStart,
      progressPct: progressResult.value,
      budgetAllocated: budgetAllocatedResult.value,
      budgetSpent: budgetSpentResult.value,
      dependsOnTaskId: row.depends_on_task_id?.trim() || undefined,
      status,
      warnings,
    };
    
    return {
      isValid: true,
      errors: [],
      warnings,
      normalized,
    };
  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
    return { isValid: false, errors, warnings };
  }
}
