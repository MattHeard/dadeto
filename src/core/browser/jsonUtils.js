/**
 * Parse JSON and return null on failure.
 * @param {string} value Raw JSON string.
 * @returns {unknown} Parsed JSON value or null.
 */
export function parseJsonOrNull(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
