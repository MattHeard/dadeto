// Shared utility functions

/**
 * Checks if a value is a non-null object (but not an array).
 * @param {*} val
 * @returns {boolean}
 */
function isNonNullNonArray(val) {
  return val !== null && !Array.isArray(val);
}

export function isObject(val) {
  return isNonNullNonArray(val) && typeof val === 'object';
}
