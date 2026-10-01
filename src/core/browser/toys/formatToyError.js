/**
 * Format a toy validation failure using the common JSON error shape.
 * @param {string} message Human-readable failure message.
 * @returns {string} Pretty-printed JSON error payload.
 */
export function formatToyError(message) {
  return formatToyResult({ valid: false, error: message });
}

/**
 * Format a toy conversion failure without a validation flag.
 * @param {string} message Human-readable failure message.
 * @returns {string} Pretty-printed JSON error payload.
 */
export function formatToyConversionError(message) {
  return formatToyResult({ error: message });
}
/**
 * Serialize a structured toy result with consistent readable indentation.
 * @param {Record<string, unknown>} payload Toy result.
 * @returns {string} Pretty-printed JSON.
 */
export function formatToyResult(payload) {
  return JSON.stringify(payload, null, 2);
}
