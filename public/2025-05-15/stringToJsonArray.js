// Toy: String to JSON Array
// Usage: Paste a string, get a JSON array output

/**
 * Converts a delimited string (e.g., comma or newline separated) to a JSON array.
 * @param {string} str - The input string.
 * @param {string} delimiter - The delimiter to split on (default: '\n').
 * @returns {string} JSON array string
 */
function stringToJsonArray(str, delimiter = '\n') {
  return JSON.stringify(
    str
      .split(delimiter)
      .map(s => s.trim())
      .filter(Boolean)
  );
}

// Example toy UI usage (Node or browser console):
// const input = 'foo\nbar\nbaz';
// console.log(stringToJsonArray(input)); // ["foo","bar","baz"]

if (typeof window !== 'undefined') {
  window.stringToJsonArray = stringToJsonArray;
}

module.exports = { stringToJsonArray };
