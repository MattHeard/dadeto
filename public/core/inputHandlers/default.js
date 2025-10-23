import {
  maybeRemoveNumber,
  maybeRemoveKV,
  maybeRemoveDendrite,
  maybeRemoveTextarea,
} from './removeElements.js';
import { hideAndDisable } from './inputState.js';

/**
 * Handle a field with no special input type.
 * @param {object} dom - DOM helper utilities.
 * @param {HTMLElement} container - Container element housing the input.
 * @param {HTMLInputElement} textInput - The text input element.
 * @returns {void}
 */
export function defaultHandler(dom, container, textInput) {
  hideAndDisable(textInput, dom);
  maybeRemoveNumber(container, dom);
  maybeRemoveKV(container, dom);
  maybeRemoveDendrite(container, dom);
  maybeRemoveTextarea(container, dom);
}
