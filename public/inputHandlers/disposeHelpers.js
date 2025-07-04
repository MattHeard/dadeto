/**
 * Determine if an element exposes a dispose function.
 * @param {HTMLElement} element - The element to check.
 * @returns {boolean} True when the element has a _dispose method.
 */
export function isDisposable(element) {
  return Boolean(element) && typeof element._dispose === 'function';
}

/**
 * Call the dispose method on an element and remove it from the DOM.
 * @param {HTMLElement} element - The element to dispose.
 * @param {HTMLElement} container - Parent container element.
 * @param {object} dom - DOM helper utilities.
 * @returns {void}
 */
export function disposeAndRemove(element, container, dom) {
  element._dispose();
  dom.removeChild(container, element);
}

/**
 * Remove an element if it exposes a dispose method.
 * @param {HTMLElement} element - Element that may be disposable.
 * @param {HTMLElement} container - Parent container element.
 * @param {object} dom - DOM helper utilities.
 * @returns {void}
 */
export function maybeRemoveElement(element, container, dom) {
  if (isDisposable(element)) {
    disposeAndRemove(element, container, dom);
  }
}
