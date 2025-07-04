/**
 *
 * @param element
 */
export function isDisposable(element) {
  return Boolean(element) && typeof element._dispose === 'function';
}

/**
 *
 * @param element
 * @param container
 * @param dom
 */
export function disposeAndRemove(element, container, dom) {
  element._dispose();
  dom.removeChild(container, element);
}

/**
 *
 * @param element
 * @param container
 * @param dom
 */
export function maybeRemoveElement(element, container, dom) {
  if (isDisposable(element)) {
    disposeAndRemove(element, container, dom);
  }
}
