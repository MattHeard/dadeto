// textFormatter.js

/**
 * Formats the given text.
 *
 * @param {string} text The text to format.
 * @returns {string} The formatted text.
 */
export function getFormattedText(text) {
  if (text.startsWith('**') && text.endsWith('**') && text.length >= 4) {
    return `<strong>${text}</strong>`;
  } else if (text.startsWith('__') && text.endsWith('__') && text.length >= 4) {
    return `<strong>${text}</strong>`;
  }
  return text;
}
