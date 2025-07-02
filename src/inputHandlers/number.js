import { ensureNumberInput } from '../browser/toys.js';

function isDisposable(element) {
  return Boolean(element) && typeof element._dispose === 'function';
}

function maybeRemoveKV(container, dom) {
  const kvContainer = dom.querySelector(container, '.kv-container');
  if (!isDisposable(kvContainer)) {
    return;
  }
  kvContainer._dispose();
  dom.removeChild(container, kvContainer);
}

function maybeRemoveDendrite(container, dom) {
  const dendriteForm = dom.querySelector(container, '.dendrite-form');
  if (!isDisposable(dendriteForm)) {
    return;
  }
  dendriteForm._dispose();
  dom.removeChild(container, dendriteForm);
}

export function numberHandler(dom, container, textInput) {
  dom.hide(textInput);
  dom.disable(textInput);
  maybeRemoveKV(container, dom);
  maybeRemoveDendrite(container, dom);
  ensureNumberInput(container, textInput, dom);
}
