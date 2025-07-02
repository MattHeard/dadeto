import { ensureNumberInput } from '../browser/toys.js';
import { maybeRemoveElement } from './disposeHelpers.js';

function maybeRemoveKV(container, dom) {
  const kvContainer = dom.querySelector(container, '.kv-container');
  maybeRemoveElement(kvContainer, container, dom);
}

function maybeRemoveDendrite(container, dom) {
  const dendriteForm = dom.querySelector(container, '.dendrite-form');
  maybeRemoveElement(dendriteForm, container, dom);
}

export function numberHandler(dom, container, textInput) {
  dom.hide(textInput);
  dom.disable(textInput);
  maybeRemoveKV(container, dom);
  maybeRemoveDendrite(container, dom);
  ensureNumberInput(container, textInput, dom);
}
