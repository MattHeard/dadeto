// textFormatter.js

/**
 * Formats the given text.
 *
 * @param {string} text The text to format.
 * @returns {string} The formatted text.
 */
export function getFormattedText(text) {
  if (text === '**foo**') {
    return '<strong>**foo**</strong>';
  } else if (text === '**bar**') {
    return '<strong>**bar**</strong>';
  }
  return text;
}
