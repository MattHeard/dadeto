/**
 * Checks if a string is empty or contains only whitespace
 * @param {string} text - The string to check
 * @returns {boolean} True if the string is empty or contains only whitespace
 */
export function isEmpty(text) {
  return !safeTrim(text);
}

/**
 * Trims whitespace from a string and returns the result
 * @param {string} text - The string to trim
 * @returns {string} The trimmed string, or undefined if input is not a string
 */
export function safeTrim(text) {
  if (typeof text !== 'string') {
    return undefined;
  }
  return text.trim();
}
