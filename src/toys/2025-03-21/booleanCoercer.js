/**
 * Coerces input to a boolean value if possible.
 * Returns an object with a 'value' property if coercion is successful,
 * or an empty object if coercion fails.
 *
 * @param {any} input - The value to coerce to boolean
 * @returns {Object} - Object with 'value' property if coercion successful, empty object if not
 */
export function coerceToBoolean(input) {
  if (typeof input === 'boolean') {
    return { value: input };
  }
  if (typeof input === 'string') {
    const lower = input.toLowerCase();
    if (lower === 'true') return { value: true };
    if (lower === 'false') return { value: false };
  }
  return {};
}