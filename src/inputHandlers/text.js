function disposeElement(container, element, dom) {
  if (typeof element?._dispose === 'function') {
    element._dispose();
    dom.removeChild(container, element);
  }
}

export function textHandler(dom, container, textInput) {
  dom.reveal(textInput);
  dom.enable(textInput);
  const numberInput = dom.querySelector(container, 'input[type="number"]');
  disposeElement(container, numberInput, dom);
  const kvContainer = dom.querySelector(container, '.kv-container');
  disposeElement(container, kvContainer, dom);
  const dendriteForm = dom.querySelector(container, '.dendrite-form');
  disposeElement(container, dendriteForm, dom);
}
