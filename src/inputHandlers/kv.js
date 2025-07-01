import { ensureKeyValueInput } from '../browser/toys.js';

// eslint-disable-next-line complexity
export function maybeRemoveNumber(container, dom) {
  const numberInput = dom.querySelector(container, 'input[type="number"]');
  const dispose = numberInput?._dispose;
  if (typeof dispose === 'function') {
    dispose.call(numberInput);
    dom.removeChild(container, numberInput);
  }
}

// eslint-disable-next-line complexity
export function maybeRemoveDendrite(container, dom) {
  const dendriteForm = dom.querySelector(container, '.dendrite-form');
  const dispose = dendriteForm?._dispose;
  if (typeof dispose === 'function') {
    dispose.call(dendriteForm);
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
