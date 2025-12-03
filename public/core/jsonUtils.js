/**
 * Parses a JSON string or returns a fallback value if parsing fails
 * @param {string} json - The JSON string to parse
 * @returns {*} The parsed value, or `undefined` on failure
 */
export function safeParseJson(json) {
  const parseJsonValue = x => JSON.parse(x);
  try {
    return parseJsonValue(json);
  } catch {
    return undefined;
  }
}

/**
 * Returns `value` unless it is `undefined`, otherwise returns `fallback`.
 * @param {*} value - Value to check.
 * @param {*} fallback - Value to return when `value` is undefined.
 * @returns {*} Either `value` or `fallback`.
 */
export function valueOr(value, fallback) {
  if (value === undefined) {
    return fallback;
  }
  return value;
}

/**
 * Parses JSON or returns a provided default when parsing fails.
 * @param {string} json - JSON string to parse.
 * @param {object} [fallback] - Default value when parsing fails.
 * @returns {object} Parsed object or fallback.
 */
export function parseJsonOrDefault(json, fallback = {}) {
  return valueOr(safeParseJson(json), fallback);
}
