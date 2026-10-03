/**
 * Format a toy validation failure using the common JSON error shape.
 * @param {unknown} message Original failure message, preserved without coercion.
 * @param {number} [indentation] JSON indentation; zero produces compact output.
 * @returns {string} Pretty-printed JSON error payload.
 */
export function formatToyError(message, indentation) {
  return formatToyResult({ valid: false, error: message }, indentation);
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
 * @param {number} [indentation] JSON indentation, defaulting to two spaces.
 * @returns {string} Pretty-printed JSON.
 */
export function formatToyResult(payload, indentation = 2) {
  return JSON.stringify(payload, null, indentation);
}
