// textFormatter.js

/**
 * Formats the given text.
 *
 * @param {string} text The text to format.
 * @returns {string} The formatted text.
 */
export function getFormattedText(text) {
  // Search for **text** patterns
  const doubleAsteriskStart = text.indexOf('**');
  if (doubleAsteriskStart !== -1) {
    const doubleAsteriskEnd = text.indexOf('**', doubleAsteriskStart + 2);
    if (doubleAsteriskEnd !== -1) {
      const beforeText = text.substring(0, doubleAsteriskStart);
      const boldText = text.substring(doubleAsteriskStart, doubleAsteriskEnd + 2);
      const afterText = text.substring(doubleAsteriskEnd + 2);
      return beforeText + `<strong>${boldText}</strong>` + afterText;
    }
  }
  
  // Search for __text__ patterns
  const doubleUnderscoreStart = text.indexOf('__');
  if (doubleUnderscoreStart !== -1) {
    const doubleUnderscoreEnd = text.indexOf('__', doubleUnderscoreStart + 2);
    if (doubleUnderscoreEnd !== -1) {
      const beforeText = text.substring(0, doubleUnderscoreStart);
      const boldText = text.substring(doubleUnderscoreStart, doubleUnderscoreEnd + 2);
      const afterText = text.substring(doubleUnderscoreEnd + 2);
      return beforeText + `<strong>${boldText}</strong>` + afterText;
    }
  }
  
  return text;
}
