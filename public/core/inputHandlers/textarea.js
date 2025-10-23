import {
  maybeRemoveNumber,
  maybeRemoveKV,
  maybeRemoveDendrite,
} from './removeElements.js';
import { hideAndDisable, revealAndEnable } from './inputState.js';
import { TEXTAREA_SELECTOR } from '../constants/selectors.js';
import { createRemoveListener } from '../../browser/document.js';
import { getInputValue, setInputValue } from '../browser/inputValueStore.js';

const TEXTAREA_CLASS = TEXTAREA_SELECTOR.slice(1);

const getTextareaSourceValue = (textInput, dom) => {
  const value = getInputValue(textInput);
  if (value) {
    return value;
  }
  if (dom && typeof dom.getValue === 'function') {
    const domValue = dom.getValue(textInput);
    return domValue ?? '';
  }
  return value;
};

const createSyncTextInputValue = (textInput, dom) => event => {
  const targetValue = dom.getTargetValue(event);
  dom.setValue(textInput, targetValue);
  setInputValue(textInput, targetValue);
};

const positionTextarea = ({ container, textInput, textarea, dom }) => {
  const nextSibling = dom.getNextSibling(textInput);
  dom.insertBefore(container, textarea, nextSibling);
};

const setupTextarea = ({ textarea, textInput, dom }) => {
  const handleInput = createSyncTextInputValue(textInput, dom);
  dom.addEventListener(textarea, 'input', handleInput);
  textarea._dispose = createRemoveListener({
    dom,
    el: textarea,
    event: 'input',
    handler: handleInput,
  });
};

export const ensureTextareaInput = (container, textInput, dom) => {
  let textarea = dom.querySelector(container, TEXTAREA_SELECTOR);

  if (!textarea) {
    textarea = dom.createElement('textarea');
    dom.setClassName(textarea, TEXTAREA_CLASS);
    const value = getTextareaSourceValue(textInput, dom);
    if (value) {
      dom.setValue(textarea, value);
    }
    positionTextarea({ container, textInput, textarea, dom });
    setupTextarea({ textarea, textInput, dom });
  } else {
    const value = getTextareaSourceValue(textInput, dom);
    dom.setValue(textarea, value);
  }

  revealAndEnable(textarea, dom);

  return textarea;
};

/**
 * Switch the UI to use a textarea input field.
 * @param {object} dom - DOM helper utilities.
 * @param {HTMLElement} container - Container element housing the input.
 * @param {HTMLInputElement} textInput - The text input element.
 * @returns {void}
 */
export function textareaHandler(dom, container, textInput) {
  hideAndDisable(textInput, dom);
  maybeRemoveNumber(container, dom);
  maybeRemoveKV(container, dom);
  maybeRemoveDendrite(container, dom);
  ensureTextareaInput(container, textInput, dom);
}
