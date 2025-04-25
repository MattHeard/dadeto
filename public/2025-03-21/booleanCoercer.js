function tryBooleanCoercion(input) {
  if (typeof input === 'boolean') {return input;}
  return normalizeBooleanString(input);
}

/**
 * Coerces input to a boolean value if possible.
 * Returns a string representation of an object with a 'value' property if coercion is successful,
 * or a string representation of an empty object if coercion fails.
 *
 * @param {any} input - The value to coerce to boolean
 * @returns {string} - String representation of object with 'value' property if coercion successful, '{}' if not
 */
export function coerceToBoolean(input) {
  const value = tryBooleanCoercion(input);
  return value !== undefined ? `{ value: ${value} }` : '{}';
}

function normalizeBooleanString(input) {
  if (typeof input !== 'string') {return undefined;}

  return parseBooleanString(input.toLowerCase());
}

function parseBooleanString(str) {
  return { true: true, false: false }[str];
}