import {
  maybeRemoveDendrite,
  maybeRemoveKV,
  maybeRemoveNumber,
  maybeRemoveTextarea,
} from '../browser-core.js';
import {
  invokeContainerHandlers,
  revealAndEnable,
} from './browserInputHandlersCore.js';

/**
 * Handle a plain text input field.
 * @param {object} dom - DOM helper utilities.
 * @param {HTMLElement} container - Container element for the input.
 * @param {HTMLInputElement} textInput - The text input element.
 * @returns {void}
 */
export function textHandler(dom, container, textInput) {
  revealAndEnable(textInput, dom);
  const containerHandlers = [
    maybeRemoveNumber,
    maybeRemoveKV,
    maybeRemoveDendrite,
    maybeRemoveTextarea,
  ];
  invokeContainerHandlers(container, dom, containerHandlers);
}
