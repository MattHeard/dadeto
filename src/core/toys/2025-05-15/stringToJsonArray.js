/*
 * String to JSON Array Toy
 * ----------------------------------------------------------
 * Toy signature:  stringToJsonArrayToy(input: string): string
 *   input : delimited string (default delimiter: ,)
 * Returns a JSON string of an array, or []
 */

/**
 * Converts a comma-delimited string to a JSON array string.
 * @param {string} input - Delimited input string.
 * @returns {string} JSON array representation.
 */
function stringToJsonArrayToy(input) {
  if (typeof input !== 'string') {
    return JSON.stringify([]);
  }
  const delimiter = ',';
  const arr = input
    .split(delimiter)
    .map(s => s.trim())
    .filter(Boolean);
  return JSON.stringify(arr);
}

export { stringToJsonArrayToy };
