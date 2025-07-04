import {
  parseExistingRows,
  createRenderer,
  createDispose,
  syncHiddenField,
} from '../browser/toys.js';
import { maybeRemoveNumber, maybeRemoveDendrite } from './removeElements.js';
import { KV_CONTAINER_SELECTOR } from '../constants/selectors.js';
import { hideAndDisable } from './inputState.js';

export const ensureKeyValueInput = (container, textInput, dom) => {
  let kvContainer = dom.querySelector(container, KV_CONTAINER_SELECTOR);
  if (!kvContainer) {
    kvContainer = dom.createElement('div');
    dom.setClassName(kvContainer, KV_CONTAINER_SELECTOR.slice(1));
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

/**
 *
 * @param dom
 * @param container
 * @param textInput
 */
export function handleKVType(dom, container, textInput) {
  maybeRemoveNumber(container, dom);
  maybeRemoveDendrite(container, dom);
  ensureKeyValueInput(container, textInput, dom);
}

/**
 *
 * @param dom
 * @param container
 * @param textInput
 */
export function kvHandler(dom, container, textInput) {
  hideAndDisable(textInput, dom);
  handleKVType(dom, container, textInput);
}
