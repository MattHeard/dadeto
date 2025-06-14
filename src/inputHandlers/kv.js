import { ensureKeyValueInput } from '../browser/toys.js';

export function maybeRemoveNumber(container, dom) {
  const numberInput = dom.querySelector(container, 'input[type="number"]');
  if (numberInput && typeof numberInput._dispose === 'function') {
    numberInput._dispose();
    dom.removeChild(container, numberInput);
  }
}

export function maybeRemoveDendrite(container, dom) {
  const dendriteForm = dom.querySelector(container, '.dendrite-form');
  if (dendriteForm && typeof dendriteForm._dispose === 'function') {
    dendriteForm._dispose();
    dom.removeChild(container, dendriteForm);
  }
}

export function handleKVType(dom, container, textInput) {
  maybeRemoveNumber(container, dom);
  maybeRemoveDendrite(container, dom);
  ensureKeyValueInput(container, textInput, dom);
}

export function kvHandler(dom, container, textInput) {
  dom.hide(textInput);
  dom.disable(textInput);
  handleKVType(dom, container, textInput);
}
