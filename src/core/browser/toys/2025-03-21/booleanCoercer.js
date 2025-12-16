/**
 * Attempt to coerce a value to boolean.
 * @param {unknown} input - Value that may represent a boolean.
 * @returns {boolean|undefined} The coerced boolean or undefined.
 */
function tryBooleanCoercion(input) {
  if (isType(input, 'boolean')) {
    return input;
  }
  return normalizeBooleanString(input);
}

/**
 * Coerce input to a boolean value if possible.
 *
 * Returns `"{ value: true }"` or `"{ value: false }"` when coercion succeeds.
 * Otherwise returns `'{}'`.
 * @param {unknown} input - Value to coerce.
 * @returns {string} JSON string describing the result.
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
 * Normalize a string that may represent a boolean.
 * @param {unknown} input - Value to normalize.
 * @returns {string|undefined} Lowercased string or undefined if not a string.
 */
function normalizeBooleanString(input) {
  if (!isType(input, 'string')) {
    return undefined;
  }
  return parseBooleanString(input.toLowerCase());
}

/**
 * Parse 'true' or 'false' strings into booleans.
 * @param {string} str - String value to parse.
 * @returns {boolean|undefined} Parsed boolean or undefined.
 */
function parseBooleanString(str) {
  return { true: true, false: false }[str];
}

/**
 * Determine whether a value matches the provided primitive type name.
 * @param {unknown} value Value to inspect.
 * @param {string} type Expected `typeof` result.
 * @returns {boolean} True when `typeof value` matches `type`.
 */
function isType(value, type) {
  return typeof value === type;
}
