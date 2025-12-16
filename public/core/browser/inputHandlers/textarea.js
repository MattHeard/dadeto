import * as browserCore from '../browser-core.js';
import {
  createUpdateTextInputValue,
  revealAndEnable,
  setupInputEvents,
} from './browserInputHandlersCore.js';
import { createSpecialInputEnsurer } from './sharedSpecialInput.js';

const TEXTAREA_SELECTOR = '.toy-textarea';
const TEXTAREA_CLASS = TEXTAREA_SELECTOR.slice(1);

const toNonEmptyString = value => {
  if (value) {
    return value;
  }

  return '';
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
  const storedValue = browserCore.getInputValue(textInput);
  if (storedValue) {
    return storedValue;
  }

  return getDomTextareaValue(textInput, dom);
};

const setupTextarea = ({ textarea, textInput, dom }) => {
  const handleInput = createUpdateTextInputValue(textInput, dom);
  setupInputEvents(dom, textarea, handleInput);
};

const shouldSetTextareaValue = (specialInput, value) =>
  Boolean(specialInput) || Boolean(value);

export const ensureTextareaInput = (container, textInput, dom) => {
  const selector = TEXTAREA_SELECTOR;
  const { existingSpecialInput: specialInput, ensure } =
    createSpecialInputEnsurer({
      selector,
      container,
      textInput,
      dom,
    });

  const textarea = ensure(() => {
    const textarea = dom.createElement('textarea');
    dom.setClassName(textarea, TEXTAREA_CLASS);
    setupTextarea({ textarea, textInput, dom });
    return textarea;
  });

  const value = getTextareaSourceValue(textInput, dom);
  if (shouldSetTextareaValue(specialInput, value)) {
    dom.setValue(textarea, value);
  }
  revealAndEnable(textarea, dom);

  return textarea;
};

const cleanupTextarea = browserCore.createDefaultHandler([
  browserCore.maybeRemoveNumber,
  browserCore.maybeRemoveKV,
  browserCore.maybeRemoveDendrite,
]);

/**
 * Switch the UI to use a textarea input field.
 * @param {object} dom - DOM helper utilities.
 * @param {HTMLElement} container - Container element housing the input.
 * @param {HTMLInputElement} textInput - The text input element.
 * @returns {void}
 */
export function textareaHandler(dom, container, textInput) {
  cleanupTextarea(dom, container, textInput);
  ensureTextareaInput(container, textInput, dom);
}
