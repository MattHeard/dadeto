import { maybeRemoveElement } from './disposeHelpers.js';

export function dispose(element, dom, container) {
  maybeRemoveElement(element, container, dom);
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
