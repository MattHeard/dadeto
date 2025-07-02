export function isDisposable(element) {
  return Boolean(element) && typeof element._dispose === 'function';
}

export function disposeAndRemove(element, container, dom) {
  element._dispose();
  dom.removeChild(container, element);
}

export function maybeRemoveElement(element, container, dom) {
  if (isDisposable(element)) {
    disposeAndRemove(element, container, dom);
  }
}
