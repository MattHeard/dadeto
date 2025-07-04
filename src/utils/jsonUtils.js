/**
 * Parses a JSON string or returns a fallback value if parsing fails
 * @param {string} json - The JSON string to parse
 * @param {*} [fallback] - The value to return on failure
 * @returns {*} The parsed value or the fallback
 */
export function safeParseJson(json) {
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

/**
 *
 * @param value
 * @param fallback
 */
export function valueOr(value, fallback) {
  if (value === undefined) {
    return fallback;
  }
  return value;
}

/**
 *
 * @param json
 * @param fallback
 */
export function parseJsonOrDefault(json, fallback = {}) {
  return valueOr(safeParseJson(json), fallback);
}
