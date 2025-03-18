// textFormatter.js

/**
 * Formats the given text.
 *
 * @param {string} text The text to format.
 * @returns {string} The formatted text.
 */
/**
 * Process text with the specified delimiter pattern
 * @param {string} text - The text to process
 * @param {string} delimiter - The delimiter to search for
 * @returns {string} - The processed text if pattern found, or null if no pattern found
 */
function processDelimiter(text, delimiter) {
  const startIndex = text.indexOf(delimiter);
  if (startIndex === -1) return null;
  
  const endIndex = text.indexOf(delimiter, startIndex + delimiter.length);
  if (endIndex === -1) return null;
  
  const beforeText = text.substring(0, startIndex);
  const boldText = text.substring(startIndex, endIndex + delimiter.length);
  const afterText = text.substring(endIndex + delimiter.length);
  
  return beforeText + `<strong>${boldText}</strong>` + afterText;
}

export function getFormattedText(text) {
  // Try processing with '**' delimiter
  const processedWithAsterisk = processDelimiter(text, '**');
  if (processedWithAsterisk) return processedWithAsterisk;
  
  // Try processing with '__' delimiter
  const processedWithUnderscore = processDelimiter(text, '__');
  if (processedWithUnderscore) return processedWithUnderscore;
  
  // Return original if no patterns found
  return text;
}
