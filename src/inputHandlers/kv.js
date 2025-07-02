import { ensureKeyValueInput } from '../browser/toys.js';
import { dispose } from './default.js';

export function maybeRemoveNumber(container, dom) {
  const numberInput = dom.querySelector(container, 'input[type="number"]');
  dispose(numberInput, dom, container);
}

export function maybeRemoveDendrite(container, dom) {
  const dendriteForm = dom.querySelector(container, '.dendrite-form');
  dispose(dendriteForm, dom, container);
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
