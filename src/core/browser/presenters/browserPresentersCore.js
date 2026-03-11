/**
 * Create a preformatted element for provided text content.
 * @param {string} content - Text that should appear inside the <pre>.
 * @param {{createElement: Function, setTextContent: Function}} dom - DOM helpers.
 * @returns {HTMLElement} `<pre>` populated with the supplied content.
 */
export function createPreFromContent(content, dom) {
  const pre = dom.createElement('pre');
  dom.setTextContent(pre, content);
  return pre;
}

/**
 * Create a paragraph element containing the provided text.
 * @param {string} inputString - Raw text for the paragraph.
 * @param {{createElement: Function, setTextContent: Function}} dom - DOM helpers.
 * @returns {HTMLElement} `<p>` populated with the supplied string.
 */
export function createParagraphElement(inputString, dom) {
  const paragraph = dom.createElement('p');
  dom.setTextContent(paragraph, inputString);
  return paragraph;
}

/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */
/** @typedef {Pick<DOMHelpers, 'createElement'|'setTextContent'>} PresenterDOMHelpers */
