import { isType } from '../../utils/validation.js';

/**
 *
 * @param input
 */
function tryBooleanCoercion(input) {
  if (isType(input, 'boolean')) {
    return input;
  }
  return normalizeBooleanString(input);
}

/**
 * Coerces input to a boolean value if possible.
 * Returns a string representation of an object with a 'value' property if coercion is successful,
 * or a string representation of an empty object if coercion fails.
 * @param {any} input - The value to coerce to boolean
 * @returns {string} - String representation of object with 'value' property if coercion successful, '{}' if not
 */
export function coerceToBoolean(input) {
  const value = tryBooleanCoercion(input);
  if (value !== undefined) {
    return `{ value: ${value} }`;
  } else {
    return '{}';
  }
}

/**
 *
 * @param input
 */
function normalizeBooleanString(input) {
  if (!isType(input, 'string')) {
    return undefined;
  }
  return parseBooleanString(input.toLowerCase());
}

/**
 *
 * @param str
 */
function parseBooleanString(str) {
  return { true: true, false: false }[str];
}
