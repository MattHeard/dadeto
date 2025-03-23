/**
 * Coerces input to a boolean value if possible.
 * Returns a string representation of an object with a 'value' property if coercion is successful,
 * or a string representation of an empty object if coercion fails.
 *
 * @param {any} input - The value to coerce to boolean
 * @returns {string} - String representation of object with 'value' property if coercion successful, '{}' if not
 */
export function coerceToBoolean(input) {
  const booleanMap = {
    true: true,
    false: false
  };

  if (typeof input === 'boolean') {
    return `{ value: ${input} }`;
  }

  const normalized = (typeof input === 'string') ? booleanMap[input.toLowerCase()] : undefined;

  return typeof normalized === 'boolean' ? `{ value: ${normalized} }` : '{}';
}