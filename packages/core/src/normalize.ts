import { TaskNormalized } from "./schema.js";
import { validateRow, RowValidationResult } from "./validate.js";
import { RawCSVRow } from "./schema.js";

/**
 * Normalize a batch of CSV rows
 * Returns normalized tasks and validation results
 */
export function normalizeRows(
  rows: RawCSVRow[]
): {
  normalized: TaskNormalized[];
  validationResults: RowValidationResult[];
} {
  const normalized: TaskNormalized[] = [];
  const validationResults: RowValidationResult[] = [];

  rows.forEach((row, index) => {
    const result = validateRow(row, index + 1);
    validationResults.push(result);

    if (result.isValid && result.normalized) {
      normalized.push(result.normalized);
    }
  });

  return { normalized, validationResults };
}
