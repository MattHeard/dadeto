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
 * Checks if a value is strictly a boolean
 * @param {*} value - The value to check
 * @returns {boolean} True if the value is of boolean type
 */
export function isBooleanType(value) {
  return isType(value, 'boolean');
}

/**
 * Determines if a string represents a boolean value
 * @param {*} value - The value to check
 * @returns {boolean} True if the value is a boolean string
 */
export function isBooleanString(value) {
  return /^(?:true|false)$/i.test(String(value));
}

/**
 * Checks if a value is a valid boolean or can be converted to one
 * @param {*} value - The value to check
 * @returns {boolean} True if the value is a valid boolean or boolean string
 */
const booleanValidators = [isBooleanType, isBooleanString];

/**
 * Determines if a value passes any of the boolean validators.
 * @param {*} value - Value to validate.
 * @returns {boolean} True when value is boolean-like.
 */
export function isValidBoolean(value) {
  return booleanValidators.some(predicate => predicate(value));
}
