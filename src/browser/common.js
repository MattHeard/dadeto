// Shared utility functions

/**
 * Checks if a value is a non-null object (but not an array).
 * @param {*} val
 * @returns {boolean}
 */
export function isObject(val) {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}
