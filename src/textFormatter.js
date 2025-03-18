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
 * @returns {string|null} - The processed text if pattern found, or null if no pattern found
 */
const processDelimiter = (text, delimiter) => {
  const startIndex = text.indexOf(delimiter);
  if (startIndex === -1) return null;
  
  const endIndex = text.indexOf(delimiter, startIndex + delimiter.length);
  if (endIndex === -1) return null;
  
  const beforeText = text.substring(0, startIndex);
  const boldText = text.substring(startIndex, endIndex + delimiter.length);
  const afterText = text.substring(endIndex + delimiter.length);
  
  return beforeText + `<strong>${boldText}</strong>` + afterText;
};

/**
 * Creates a formatter function for a specific delimiter
 * @param {string} delimiter - The delimiter to format
 * @returns {function} - A formatter function for the delimiter
 */
const createDelimiterFormatter = (delimiter) => (text) => processDelimiter(text, delimiter);

/**
 * Combines multiple formatters into a chain using the Chain of Responsibility pattern
 * @param {...function} formatters - The formatter functions to chain
 * @returns {function} - A function that applies all formatters in sequence
 */
const chainFormatters = (...formatters) => (text) => {
  for (const formatter of formatters) {
    const result = formatter(text);
    if (result) return result;
  }
  return text;
};

/**
 * Create specific formatters for each delimiter type
 */
const asteriskFormatter = createDelimiterFormatter('**');
const underscoreFormatter = createDelimiterFormatter('__');

/**
 * Combine the formatters into a chain
 */
const formatterChain = chainFormatters(
  asteriskFormatter,
  underscoreFormatter
);

/**
 * Format the given text using the chain of formatters
 * @param {string} text - The text to format
 * @returns {string} - The formatted text
 */
export function getFormattedText(text) {
  return formatterChain(text);
}
