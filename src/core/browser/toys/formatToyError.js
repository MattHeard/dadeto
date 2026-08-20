/**
 * Format a toy validation failure using the common JSON error shape.
 * @param {string} message Human-readable failure message.
 * @returns {string} Pretty-printed JSON error payload.
 */
export function formatToyError(message) {
  return JSON.stringify({ valid: false, error: message }, null, 2);
}

/**
 * Format a toy conversion failure without a validation flag.
 * @param {string} message Human-readable failure message.
 * @returns {string} Pretty-printed JSON error payload.
 */
export function formatToyConversionError(message) {
  return JSON.stringify({ error: message }, null, 2);
}
