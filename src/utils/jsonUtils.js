/**
 * Parses a JSON string or returns a fallback value if parsing fails
 * @param {string} json - The JSON string to parse
 * @param {*} [fallback={}] - The value to return on failure
 * @returns {*} The parsed value or the fallback
 */
export function parseJsonOrDefault(json, fallback = {}) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}
