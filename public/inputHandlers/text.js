import {
  maybeRemoveNumber,
  maybeRemoveKV,
  maybeRemoveDendrite,
} from './removeElements.js';
import { revealAndEnable } from './inputState.js';

/**
 * Handle a plain text input field.
 * @param {object} dom - DOM helper utilities.
 * @param {HTMLElement} container - Container element for the input.
 * @param {HTMLInputElement} textInput - The text input element.
 * @returns {void}
 */
export function textHandler(dom, container, textInput) {
  revealAndEnable(textInput, dom);
  maybeRemoveNumber(container, dom);
  maybeRemoveKV(container, dom);
  maybeRemoveDendrite(container, dom);
}
