/**
 * @param {unknown} value Candidate object-like value.
 * @returns {boolean} Whether the value is a non-null object.
 */
export function isObjectValue(value) {
  return Boolean(value) && typeof value === 'object';
}

/**
 * @param {string} input Serialized JSON payload.
 * @returns {Record<string, unknown> | null} Parsed JSON object or null on parse failure.
 */
export function parseJsonObject(input) {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}
