// Shared input predicates for the spacetime toys.

/**
 * Determine whether a value is a non-array object.
 * @param {unknown} value - Candidate value.
 * @returns {boolean} Whether the value is a JSON object.
 */
export function isJsonObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Normalize a segment identifier supplied by a request.
 * @param {unknown} value - Candidate identifier.
 * @returns {string} Normalized identifier.
 */
export function normalizeSegmentId(value) {
  return String(value ?? '').trim();
}
