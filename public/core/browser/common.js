// Shared utility functions for browser code.

/**
 * Check that the value is an object, excluding `null` and arrays.
 * @param {*} val Candidate to inspect.
 * @returns {boolean} True when `val` is an ordinary object.
 */
function isNonNullNonArray(val) {
  return val !== null && !Array.isArray(val);
}

/**
 * Determine whether the input is a non-null object.
 * @param {*} val Candidate value.
 * @returns {boolean} True when `val` is an object suitable for property access.
 */
export function isObject(val) {
  return isNonNullNonArray(val) && typeof val === 'object';
}
