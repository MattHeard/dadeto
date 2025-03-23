/**
 * Coerces input to a boolean value if possible.
 * Returns a string representation of an object with a 'value' property if coercion is successful,
 * or a string representation of an empty object if coercion fails.
 *
 * @param {any} input - The value to coerce to boolean
 * @returns {string} - String representation of object with 'value' property if coercion successful, '{}' if not
 */
export function coerceToBoolean(input) {
  if (typeof input === 'boolean') {
    return `{ value: ${input} }`;
  }

  const normalized = normalizeBooleanString(input);
  return normalized !== undefined ? `{ value: ${normalized} }` : '{}';
}

function normalizeBooleanString(input) {
  if (typeof input !== 'string') return undefined;
  const lower = input.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  return undefined;
}