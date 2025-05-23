/**
 * Validates if a value is of a specific type
 * @param {*} value - The value to check
 * @param {string} type - The expected type (e.g., 'string', 'boolean', 'number')
 * @returns {boolean} True if the value is of the specified type
 */
export function isType(value, type) {
  return typeof value === type;
}

/**
 * Checks if a value is a non-empty string
 * @param {*} value - The value to check
 * @returns {boolean} True if the value is a non-empty string
 */
export function isValidString(value) {
  return value && typeof value === 'string';
}

/**
 * Checks if a value is a valid boolean or can be converted to one
 * @param {*} value - The value to check
 * @returns {boolean} True if the value is a valid boolean or boolean string
 */
export function isValidBoolean(value) {
  if (typeof value === 'boolean') {return true;}
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    return lower === 'true' || lower === 'false';
  }
  return false;
}
