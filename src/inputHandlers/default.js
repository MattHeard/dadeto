function dispose(element, dom, container) {
  if (element && typeof element._dispose === 'function') {
    element._dispose();
    dom.removeChild(container, element);
  }
}

export function defaultHandler(dom, container, textInput) {
  dom.hide(textInput);
  dom.disable(textInput);
  const numberInput = dom.querySelector(container, 'input[type="number"]');
  dispose(numberInput, dom, container);
  const kvContainer = dom.querySelector(container, '.kv-container');
  dispose(kvContainer, dom, container);
  const dendriteForm = dom.querySelector(container, '.dendrite-form');
  dispose(dendriteForm, dom, container);
}
