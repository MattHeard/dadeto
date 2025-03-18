// textFormatter.js

/**
 * Formats the given text.
 *
 * @param {string} text The text to format.
 * @returns {string} The formatted text.
 */
export function getFormattedText(text) {
  // Check for complete string match first
  if ((text.startsWith('**') && text.endsWith('**') || 
       text.startsWith('__') && text.endsWith('__')) && 
      text.length >= 4) {
    return `<strong>${text}</strong>`;
  }
  
  // Search for **text** patterns
  const startIndex = text.indexOf('**');
  if (startIndex !== -1) {
    const endIndex = text.indexOf('**', startIndex + 2);
    if (endIndex !== -1) {
      const beforeText = text.substring(0, startIndex);
      const boldText = text.substring(startIndex, endIndex + 2);
      const afterText = text.substring(endIndex + 2);
      return beforeText + `<strong>${boldText}</strong>` + afterText;
    }
  }
  
  return text;
}
