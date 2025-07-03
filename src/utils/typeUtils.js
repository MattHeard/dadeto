/**
 * Utility type-checking helpers.
 */

/**
 * Determines if a value is a plain object (not null and not an array).
 * @param {*} val - Value to test.
 * @returns {boolean} True when val is a non-null object.
 */
export function isObject(val) {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}
