/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */

/**
 * Read the browser clipboard object from DOM helpers.
 * @param {DOMHelpers} dom - DOM helper facade.
 * @returns {Clipboard | undefined} Clipboard object when available.
 */
function getClipboard(dom) {
  const navigator = dom.globalThis.navigator;
  if (!navigator) {
    return undefined;
  }

  return navigator.clipboard;
}

/**
 * Log a copy failure.
 * @param {DOMHelpers} dom - DOM helper facade.
 * @param {unknown} error - Copy error.
 * @returns {void}
 */
function logCopyFailure(dom, error) {
  dom.logError('Failed to copy output to clipboard:', error);
}

/**
 * Copy text using a clipboard object.
 * @param {string} inputString - Raw output text to copy.
 * @param {Clipboard} clipboard - Clipboard object.
 * @param {DOMHelpers} dom - DOM helper facade.
 * @returns {Promise<void>} Copy completion promise.
 */
function copyUsingClipboard(inputString, clipboard, dom) {
  return clipboard.writeText(inputString).catch(error => {
    logCopyFailure(dom, error);
  });
}

/**
 * Copy text to the browser clipboard.
 * @param {string} inputString - Raw output text to copy.
 * @param {DOMHelpers} dom - DOM helper facade.
 * @returns {Promise<void>} Copy completion promise.
 */
async function copyToClipboard(inputString, dom) {
  const clipboard = getClipboard(dom);
  if (!clipboard) {
    logCopyFailure(dom, new Error('navigator.clipboard is not available'));
    return;
  }

  await copyUsingClipboard(inputString, clipboard, dom);
}

/**
 * Create a button that copies output text to the clipboard.
 * @param {string} inputString - Raw output text to copy.
 * @param {DOMHelpers} dom - DOM helper facade.
 * @returns {HTMLElement} Button element.
 */
export function createCopyToClipboardButtonElement(inputString, dom) {
  const button = dom.createElement('button');
  dom.setType(button, 'button');
  dom.setTextContent(button, 'Copy to clipboard');
  dom.addEventListener(button, 'click', event => {
    event.preventDefault();
    copyToClipboard(inputString, dom);
  });
  return button;
}
