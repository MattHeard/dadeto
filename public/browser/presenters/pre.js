import { withFallback } from '../common.js';

// Pre-formatted text presenter
// Creates a <pre> element with the given string as its text content using a DOM abstraction

/**
 * Determine if a string starts with '[' and ends with ']'.
 * @param {string} str - The string to check.
 * @returns {boolean} Whether the string is enclosed in brackets.
 */
function isSurroundedByBrackets(str) {
  return str.startsWith('[') && str.endsWith(']');
}

/**
 * Check if the given value is a bracketed list string.
 * @param {unknown} str - Value to evaluate.
 * @returns {boolean} True if str is a bracketed list string.
 */
function isBracketedListString(str) {
  return typeof str === 'string' && isSurroundedByBrackets(str);
}

/**
 * Format a bracketed list string into newline-separated items.
 * @param {string} inputString - The bracketed list string.
 * @returns {string} Newline-separated list items.
 */
function formatBracketedListString(inputString) {
  const inner = inputString.slice(1, -1).trim();
  return withFallback(inner.length > 0, () =>
    inner
      .split(',')
      .map(s => s.trim())
      .join('\n')
  );
}

/**
 * Determine the pre element content for a given input string.
 * @param {string} inputString - The input provided to the presenter.
 * @returns {string} The formatted string for the <pre> element.
 */
function getPreContent(inputString) {
  if (isBracketedListString(inputString)) {
    return formatBracketedListString(inputString);
  }
  return inputString;
}

/**
 * Create a <pre> element with the provided text.
 * @param {string} inputString - The raw input text or list string.
 * @param {{createElement: Function, setTextContent: Function}} dom - DOM utilities.
 * @returns {HTMLElement} The <pre> element populated with content.
 */
export function createPreElement(inputString, dom) {
  const pre = dom.createElement('pre');
  const content = getPreContent(inputString);
  dom.setTextContent(pre, content);
  return pre;
}
