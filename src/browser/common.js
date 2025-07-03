// Shared utility functions

/**
 * Checks if a value is a non-null object (but not an array).
 * @param {*} val
 * @returns {boolean}
 */
function isNonNullNonArray(val) {
  return val !== null && !Array.isArray(val);
}

/**
 * Determine if a value is an object that is not null or an array.
 *
 * @param {*} val - Value to test.
 * @returns {boolean} True when `val` is an object.
 */
export function isObject(val) {
  return isNonNullNonArray(val) && typeof val === 'object';
}
