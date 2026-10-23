/**
 * Check for a non-array record.
 * @param {unknown} value Candidate record.
 * @returns {value is Record<string, any>} Whether value is a record.
 */
export function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Create one stable indexed or unindexed validation error.
 * @param {string} code Error code.
 * @param {number} [index] Optional failing record index.
 * @returns {Array<{code: string, index?: number}>} One validation error.
 */
export function createValidationError(code, index) {
  return index === undefined ? [{ code }] : [{ code, index }];
}

/**
 * Check for a finite nonnegative measurement.
 * @param {unknown} value Candidate numeric value.
 * @returns {value is number} Whether value is finite and nonnegative.
 */
export function isNonnegativeFinite(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
