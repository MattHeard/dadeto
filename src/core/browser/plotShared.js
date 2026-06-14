/**
 * Return the value when it is a finite number; otherwise use the fallback.
 * @param {unknown} value Candidate value.
 * @param {number} fallback Fallback number.
 * @returns {number} Normalized number.
 */
export function numberOr(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * Return the value when it is a non-empty string; otherwise use the fallback.
 * @param {unknown} value Candidate value.
 * @param {string} fallback Fallback string.
 * @returns {string} Normalized string.
 */
export function stringOr(value, fallback) {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/**
 * Parse a JSON string into a plain object payload or null.
 * @param {string} inputString JSON input.
 * @param {(payload: Record<string, unknown>) => unknown} mapPayload Payload mapper.
 * @returns {unknown} Parsed and mapped payload or null.
 */
export function parseObjectPayload(inputString, mapPayload) {
  try {
    const parsed = JSON.parse(inputString);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return mapPayload(/** @type {Record<string, unknown>} */ (parsed));
  } catch {
    return null;
  }
}
