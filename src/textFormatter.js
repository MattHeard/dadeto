// textFormatter.js

/**
 * Formats the given text.
 *
 * @param {string} text The text to format.
 * @returns {string} The formatted text.
 */
export function getFormattedText(text) {
  let formattedText = text;
  
  // Check for complete string match first
  if ((text.startsWith('**') && text.endsWith('**') || 
       text.startsWith('__') && text.endsWith('__')) && 
      text.length >= 4) {
    return `<strong>${text}</strong>`;
  }
  
  // Search for **text** patterns
  let startIndex = formattedText.indexOf('**');
  if (startIndex !== -1) {
    const endIndex = formattedText.indexOf('**', startIndex + 2);
    if (endIndex !== -1) {
      const beforeText = formattedText.substring(0, startIndex);
      const boldText = formattedText.substring(startIndex, endIndex + 2);
      const afterText = formattedText.substring(endIndex + 2);
      formattedText = beforeText + `<strong>${boldText}</strong>` + afterText;
    }
  }
  
  return formattedText;
}
