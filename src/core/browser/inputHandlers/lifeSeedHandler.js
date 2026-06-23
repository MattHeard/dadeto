import { textareaHandler } from './textarea.js';

/**
 * Switch the UI to the Conway Life seed editor.
 * @param {import('../domHelpers.js').DOMHelpers} dom - DOM helper utilities.
 * @param {HTMLElement} container - Container element housing the input.
 * @param {HTMLInputElement} textInput - The text input element.
 * @returns {void}
 */
export function lifeSeedHandler(dom, container, textInput) {
  textareaHandler(dom, container, textInput);
}
