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
