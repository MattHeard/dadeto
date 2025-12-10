import {
  applyCleanupHandlers,
  revealAndEnable,
} from './browserInputHandlersCore.js';
import { BASE_CONTAINER_HANDLERS, maybeRemoveNumber } from '../browser-core.js';

/**
 * Handle a plain text input field.
 * @param {object} dom - DOM helper utilities.
 * @param {HTMLElement} container - Container element for the input.
 * @param {HTMLInputElement} textInput - The text input element.
 * @returns {void}
 */
export function textHandler(dom, container, textInput) {
  revealAndEnable(textInput, dom);
  applyCleanupHandlers({
    container,
    dom,
    baseHandlers: BASE_CONTAINER_HANDLERS,
    extraHandlers: [maybeRemoveNumber],
  });
}
