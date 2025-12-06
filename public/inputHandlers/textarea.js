import {
  createRemoveListener,
  getInputValue,
  hideAndDisable,
  maybeRemoveDendrite,
  maybeRemoveKV,
  maybeRemoveNumber,
} from '../browser-core.js';
import {
  createUpdateTextInputValue,
  revealAndEnable,
} from './browserInputHandlersCore.js';

const TEXTAREA_SELECTOR = '.toy-textarea';
const TEXTAREA_CLASS = TEXTAREA_SELECTOR.slice(1);

const toNonEmptyString = value => {
  if (value) {
    return value;
  }

  return '';
};

const shouldSetTextareaValue = (value, skipEmpty) => {
  if (skipEmpty) {
    return Boolean(value);
  }

  return true;
};

const getDomTextareaValue = (textInput, dom) => {
  if (!canReadTextareaValue(dom)) {
    return '';
  }

  return toNonEmptyString(dom.getValue(textInput));
};

const canReadTextareaValue = dom =>
  Boolean(dom) && typeof dom.getValue === 'function';

const getTextareaSourceValue = (textInput, dom) => {
  const storedValue = getInputValue(textInput);
  if (storedValue) {
    return storedValue;
  }

  return getDomTextareaValue(textInput, dom);
};

const positionTextarea = ({ container, textInput, textarea, dom }) => {
  const nextSibling = dom.getNextSibling(textInput);
  dom.insertBefore(container, textarea, nextSibling);
};

const setupTextarea = ({ textarea, textInput, dom }) => {
  const handleInput = createUpdateTextInputValue(textInput, dom);
  dom.addEventListener(textarea, 'input', handleInput);
  textarea._dispose = createTextareaDisposer(dom, textarea, handleInput);
};

const createTextareaDisposer = (dom, textarea, handler) =>
  createRemoveListener({
    dom,
    el: textarea,
    event: 'input',
    handler,
  });

const createTextarea = ({ container, textInput, dom }) => {
  const textarea = dom.createElement('textarea');
  dom.setClassName(textarea, TEXTAREA_CLASS);
  positionTextarea({ container, textInput, textarea, dom });
  setupTextarea({ textarea, textInput, dom });
  return textarea;
};

const syncTextareaValue = ({ textarea, textInput, dom, skipEmpty }) => {
  const value = getTextareaSourceValue(textInput, dom);
  if (!shouldSetTextareaValue(value, skipEmpty)) {
    return;
  }

  dom.setValue(textarea, value);
};

export const ensureTextareaInput = (container, textInput, dom) => {
  const existingTextarea = dom.querySelector(container, TEXTAREA_SELECTOR);
  const textarea =
    existingTextarea ?? createTextarea({ container, textInput, dom });

  syncTextareaValue({
    textarea,
    textInput,
    dom,
    skipEmpty: !existingTextarea,
  });
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
