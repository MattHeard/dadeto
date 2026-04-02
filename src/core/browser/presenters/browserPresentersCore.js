import { parseJsonObject } from '../jsonValueHelpers.js';

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

/**
 * Create a div element with the supplied class name for presenter roots.
 * @param {{createElement: Function, setClassName: Function}} dom - DOM helpers.
 * @param {string} className - Class name to apply to the root element.
 * @returns {HTMLElement} `<div>` root element for a presenter.
 */
export function createPresenterRoot(dom, className) {
  const root = dom.createElement('div');
  dom.setClassName(root, className);
  return root;
}

/**
 * Render a parsed presenter payload or return the fallback element.
 * @param {{
 *   inputString: string,
 *   dom: { createElement: Function, setClassName: Function, setTextContent: Function },
 *   parse: (inputString: string) => unknown,
 *   render: (parsed: unknown, dom: { createElement: Function, setClassName: Function, setTextContent: Function }) => HTMLElement,
 *   createFallback: (inputString: string, dom: { createElement: Function, setClassName: Function, setTextContent: Function }) => HTMLElement,
 * }} options Presenter rendering options.
 * @returns {HTMLElement} Rendered presenter output.
 */
export function renderParsedPresenter(options) {
  const parsed = options.parse(options.inputString);
  if (!parsed) {
    return options.createFallback(options.inputString, options.dom);
  }

  return options.render(parsed, options.dom);
}

/**
 * Create a presenter element by parsing JSON-like text and rendering it with a fallback.
 * @template TParsed
 * @param {{
 *   inputString: string,
 *   dom: { createElement: Function, setClassName: Function, setTextContent: Function },
 *   parse: (inputString: string) => TParsed | null,
 *   render: (parsed: TParsed, dom: { createElement: Function, setClassName: Function, setTextContent: Function }) => HTMLElement,
 *   createFallback: (inputString: string, dom: { createElement: Function, setClassName: Function, setTextContent: Function }) => HTMLElement,
 * }} options Presenter rendering options.
 * @returns {HTMLElement} Rendered presenter output.
 */
export function createParsedPresenterElement(options) {
  return renderParsedPresenter(options);
}

/**
 * Parse presenter JSON input and return a typed object when valid.
 * @template T
 * @param {string} inputString Presenter payload string.
 * @returns {T | null} Parsed JSON object or null on invalid input.
 */
export function parsePresenterJsonObject(inputString) {
  return /** @type {T | null} */ (parseJsonObject(inputString));
}

/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */
/** @typedef {Pick<DOMHelpers, 'createElement'|'setTextContent'>} PresenterDOMHelpers */
