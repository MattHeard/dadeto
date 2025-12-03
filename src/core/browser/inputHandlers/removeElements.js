import { maybeRemoveElement } from './disposeHelpers.js';
import { TEXTAREA_SELECTOR } from '../../constants/selectors.js';
import { DENDRITE_FORM_SELECTOR } from './browserInputHandlersCore.js';

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
/**
 * Removes a dendrite form if present.
 */
export const maybeRemoveDendrite = createElementRemover(DENDRITE_FORM_SELECTOR);

/**
 * Removes a textarea input element if present.
 */
export const maybeRemoveTextarea = createElementRemover(TEXTAREA_SELECTOR);
