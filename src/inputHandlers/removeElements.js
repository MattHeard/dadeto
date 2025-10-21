import { maybeRemoveElement } from './disposeHelpers.js';
import {
  NUMBER_INPUT_SELECTOR,
  KV_CONTAINER_SELECTOR,
  DENDRITE_FORM_SELECTOR,
  TEXTAREA_SELECTOR,
} from '../constants/selectors.js';

/**
 * Factory that removes an element matching a selector when it exists.
 * @param {string} selector - CSS selector to locate the element.
 * @returns {(container: *, dom: object) => void} Remover callback.
 */
function createElementRemover(selector) {
  return (container, dom) => {
    const element = dom.querySelector(container, selector);
    maybeRemoveElement(element, container, dom);
  };
}

/**
 * Removes a number input element if present.
 */
export const maybeRemoveNumber = createElementRemover(NUMBER_INPUT_SELECTOR);

/**
 * Removes a key-value container if present.
 */
export const maybeRemoveKV = createElementRemover(KV_CONTAINER_SELECTOR);

/**
 * Removes a dendrite form if present.
 */
export const maybeRemoveDendrite = createElementRemover(DENDRITE_FORM_SELECTOR);

/**
 * Removes a textarea input element if present.
 */
export const maybeRemoveTextarea = createElementRemover(TEXTAREA_SELECTOR);
