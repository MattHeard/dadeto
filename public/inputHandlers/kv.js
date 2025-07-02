import { ensureKeyValueInput } from '../browser/toys.js';
import { maybeRemoveElement } from './disposeHelpers.js';

export const maybeRemoveNumber = (container, dom) =>
  maybeRemoveElement(
    dom.querySelector(container, 'input[type="number"]'),
    container,
    dom
  );

export const maybeRemoveDendrite = (container, dom) =>
  maybeRemoveElement(
    dom.querySelector(container, '.dendrite-form'),
    container,
    dom
  );

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
