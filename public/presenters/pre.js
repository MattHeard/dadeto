// Pre-formatted text presenter
// Creates a <pre> element with the given string as its text content using a DOM abstraction

/**
 * Create a <pre> DOM element with pre-formatted text.
 * @param {string} inputString - The text to display (may include newlines and spaces).
 * @param {object} dom - An object with createElement and setTextContent methods.
 * @returns {HTMLElement} The <pre> element with the provided text content.
 */
export function createPreElement(inputString, dom) {
  const pre = dom.createElement('pre');
  dom.setTextContent(pre, inputString);
  return pre;
}
