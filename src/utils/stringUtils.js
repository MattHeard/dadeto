/**
 * Checks if a string is empty or contains only whitespace
 * @param {string} text - The string to check
 * @returns {boolean} True if the string is empty or contains only whitespace
 */
export function isEmpty(text) {
  return !text?.trim();
}

/**
 * Checks if a value is a non-empty string
 * @param {*} value - The value to check
 * @returns {boolean} True if the value is a non-empty string
 */
export function isValidText(text) {
  return text && typeof text === 'string';
}

/**
 * Trims whitespace from a string and returns the result
 * @param {string} text - The string to trim
 * @returns {string} The trimmed string, or undefined if input is not a string
 */
export function safeTrim(text) {
  return typeof text === 'string' ? text.trim() : undefined;
}
