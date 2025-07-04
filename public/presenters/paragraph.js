/**
 * Create a paragraph element containing the provided text.
 * @param {string} inputString - Text to place inside the paragraph.
 * @param {{createElement: Function, setTextContent: Function}} dom - DOM utilities.
 * @returns {HTMLElement} The created paragraph element.
 */
export function createParagraphElement(inputString, dom) {
  const paragraph = dom.createElement('p');
  dom.setTextContent(paragraph, inputString);
  return paragraph;
}
