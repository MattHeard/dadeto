// Shared utility functions

/**
 * Checks if a value is a non-null object (but not an array).
 * @param {*} val
 * @returns {boolean}
 */
export function isObject(val) {
  if (val === null) {return false;}
  if (Array.isArray(val)) {return false;}
  return typeof val === 'object';
}

