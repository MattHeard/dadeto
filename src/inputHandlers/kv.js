import { ensureKeyValueInput } from '../browser/toys.js';

function maybeRemoveNumber(container, dom) {
  const numberInput = dom.querySelector(container, 'input[type="number"]');
  if (numberInput && typeof numberInput._dispose === 'function') {
    numberInput._dispose();
    dom.removeChild(container, numberInput);
  }
}

export function handleKVType(dom, container, textInput) {
  maybeRemoveNumber(container, dom);
  ensureKeyValueInput(container, textInput, dom);
}

export function kvHandler(dom, container, textInput) {
  dom.hide(textInput);
  dom.disable(textInput);
  handleKVType(dom, container, textInput);
}
