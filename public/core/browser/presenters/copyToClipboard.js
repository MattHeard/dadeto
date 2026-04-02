import { reportAndReturnFalse, whenNotNullish } from '../../commonCore.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */

const COPY_BUTTON_LABEL = 'Copy to clipboard';
const COPIED_BUTTON_LABEL = 'Copied!';
const COPY_FEEDBACK_DELAY_MS = 1000;

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
 * @returns {Promise<boolean>} True when the copy operation succeeds.
 */
async function copyUsingClipboard(inputString, clipboard, dom) {
  try {
    await clipboard.writeText(inputString);
    return true;
  } catch (error) {
    return reportAndReturnFalse(logCopyFailure, dom, error);
  }
}

/**
 * Copy text to the browser clipboard.
 * @param {string} inputString - Raw output text to copy.
 * @param {DOMHelpers} dom - DOM helper facade.
 * @returns {Promise<boolean>} True when the copy operation succeeds.
 */
async function copyToClipboard(inputString, dom) {
  const clipboard = getClipboard(dom);
  if (!clipboard) {
    logCopyFailure(dom, new Error('navigator.clipboard is not available'));
    return false;
  }

  return copyUsingClipboard(inputString, clipboard, dom);
}

/**
 * Clear a pending copy feedback timeout.
 * @param {{
 *   dom: DOMHelpers,
 *   state: { timeoutHandle: number | null },
 * }} options - Copy feedback state.
 * @returns {void}
 */
function clearCopyFeedbackTimeout(options) {
  const { dom, state } = options;
  whenNotNullish(state.timeoutHandle, timeoutHandle => {
    dom.clearTimeout(timeoutHandle);
    resetCopyFeedbackState(state);
  });
}

/**
 * Restore the copy button label.
 * @param {{
 *   button: HTMLElement,
 *   dom: DOMHelpers,
 *   state: { timeoutHandle: number | null },
 * }} options - Copy feedback state.
 * @returns {void}
 */
function resetCopyButtonLabel(options) {
  const { button, dom, state } = options;
  setCopyButtonLabel(button, dom, COPY_BUTTON_LABEL);
  resetCopyFeedbackState(state);
}

/**
 * Show temporary success feedback after a copy.
 * @param {{
 *   button: HTMLElement,
 *   dom: DOMHelpers,
 *   state: { timeoutHandle: number | null },
 * }} options - Copy feedback state.
 * @returns {void}
 */
function showCopySuccessFeedback(options) {
  const { button, dom, state } = options;
  clearCopyFeedbackTimeout(options);
  setCopyButtonLabel(button, dom, COPIED_BUTTON_LABEL);
  state.timeoutHandle = dom.setTimeout(() => {
    resetCopyButtonLabel({ button, dom, state });
  }, COPY_FEEDBACK_DELAY_MS);
}

/**
 * Reset the copy-feedback timer state.
 * @param {{ timeoutHandle: number | null }} state - Copy feedback state.
 * @returns {void}
 */
function resetCopyFeedbackState(state) {
  state.timeoutHandle = null;
}

/**
 * Update the copy button label.
 * @param {HTMLElement} button - Copy button.
 * @param {DOMHelpers} dom - DOM helper facade.
 * @param {string} label - Button label.
 * @returns {void}
 */
function setCopyButtonLabel(button, dom, label) {
  dom.setTextContent(button, label);
}

/**
 * Handle a click on the copy button.
 * @param {{
 *   button: HTMLElement,
 *   dom: DOMHelpers,
 *   inputString: string,
 *   state: { timeoutHandle: number | null },
 * }} options - Click handler dependencies.
 * @returns {Promise<void>} Copy completion promise.
 */
async function handleCopyButtonClick(options) {
  const { dom, inputString } = options;
  if (!(await copyToClipboard(inputString, dom))) {
    return;
  }

  showCopySuccessFeedback(options);
}

/**
 * Create a button that copies output text to the clipboard.
 * @param {string} inputString - Raw output text to copy.
 * @param {DOMHelpers} dom - DOM helper facade.
 * @returns {HTMLElement} Button element.
 */
export function createCopyToClipboardButtonElement(inputString, dom) {
  const button = dom.createElement('button');
  const state = {
    timeoutHandle: null,
  };
  dom.setType(button, 'button');
  dom.setTextContent(button, COPY_BUTTON_LABEL);
  dom.addEventListener(button, 'click', event => {
    event.preventDefault();
    return handleCopyButtonClick({
      button,
      dom,
      inputString,
      state,
    });
  });
  return button;
}
