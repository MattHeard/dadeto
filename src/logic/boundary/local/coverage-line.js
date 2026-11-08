/**
 * Interpret an untrusted Istanbul source-line candidate without coercion.
 * Number.isInteger proves the numeric cast; preserve all integer values rather
 * than imposing a new positive/safe-integer domain restriction.
 * @param {unknown} value Untrusted source-line candidate.
 * @returns {number | null} Integer line or unavailable location.
 */
export function parseCoverageLine(value) {
  return Number.isInteger(value) ? /** @type {number} */ (value) : null;
}
