/**
 * Parses a JSON string or returns a fallback value if parsing fails
 * @param {string} json - The JSON string to parse
 * @param {*} [fallback={}] - The value to return on failure
 * @returns {*} The parsed value or the fallback
 */
export function safeParseJson(json) {
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

export function valueOr(value, fallback) {
  return value === undefined ? fallback : value;
}

export function parseJsonOrDefault(json, fallback = {}) {
  return valueOr(safeParseJson(json), fallback);
}
