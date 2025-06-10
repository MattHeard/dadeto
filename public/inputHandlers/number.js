import { ensureNumberInput } from '../browser/toys.js';

function maybeRemoveKV(container, dom) {
  const kvContainer = dom.querySelector(container, '.kv-container');
  if (kvContainer && typeof kvContainer._dispose === 'function') {
    kvContainer._dispose();
    dom.removeChild(container, kvContainer);
  }
}

function maybeRemoveDendrite(container, dom) {
  const dendriteForm = dom.querySelector(container, '.dendrite-form');
  if (dendriteForm && typeof dendriteForm._dispose === 'function') {
    dendriteForm._dispose();
    dom.removeChild(container, dendriteForm);
  }
}

export function numberHandler(dom, container, textInput) {
  dom.hide(textInput);
  dom.disable(textInput);
  maybeRemoveKV(container, dom);
  maybeRemoveDendrite(container, dom);
  ensureNumberInput(container, textInput, dom);
}
