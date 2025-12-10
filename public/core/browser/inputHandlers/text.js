import { revealAndEnable } from './browserInputHandlersCore.js';
import {
  applyBaseCleanupHandlers,
  maybeRemoveNumber,
} from '../browser-core.js';

/**
 * Handle a plain text input field.
 * @param {object} dom - DOM helper utilities.
 * @param {HTMLElement} container - Container element for the input.
 * @param {HTMLInputElement} textInput - The text input element.
 * @returns {void}
 */
export function textHandler(dom, container, textInput) {
  revealAndEnable(textInput, dom);
  applyBaseCleanupHandlers({
    container,
    dom,
    extraHandlers: [maybeRemoveNumber],
  });
}
