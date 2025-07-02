import {
  parseExistingRows,
  createRenderer,
  createDispose,
  syncHiddenField,
} from '../browser/toys.js';
import { maybeRemoveElement } from './disposeHelpers.js';

export const ensureKeyValueInput = (container, textInput, dom) => {
  let kvContainer = dom.querySelector(container, '.kv-container');
  if (!kvContainer) {
    kvContainer = dom.createElement('div');
    dom.setClassName(kvContainer, 'kv-container');
    const nextSibling = dom.getNextSibling(textInput);
    dom.insertBefore(container, kvContainer, nextSibling);
  }

  const rows = parseExistingRows(dom, textInput);
  const disposers = [];

  const render = createRenderer({
    dom,
    disposersArray: disposers,
    container: kvContainer,
    rows,
    textInput,
    syncHiddenField,
  });

  render();

  const dispose = createDispose({
    disposers,
    dom,
    container: kvContainer,
    rows,
  });
  kvContainer._dispose = dispose;

  return kvContainer;
};

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
