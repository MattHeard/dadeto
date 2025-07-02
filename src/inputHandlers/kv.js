import { ensureKeyValueInput } from '../browser/toys.js';
import { maybeRemoveElement } from './disposeHelpers.js';

export function maybeRemoveNumber(container, dom) {
  const numberInput = dom.querySelector(container, 'input[type="number"]');
  maybeRemoveElement(numberInput, container, dom);
}

export function maybeRemoveDendrite(container, dom) {
  const dendriteForm = dom.querySelector(container, '.dendrite-form');
  maybeRemoveElement(dendriteForm, container, dom);
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
