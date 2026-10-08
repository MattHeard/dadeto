/**
 * Count lines using the repository's line-splitting convention.
 * @param {string} text Text content to measure.
 * @returns {number} Number of lines in the content.
 */
export function countTextLines(text) {
  return text.split('\n').length;
}
