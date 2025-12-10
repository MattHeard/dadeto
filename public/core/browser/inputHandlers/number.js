import {
  insertBeforeNextSibling,
  setupInputEvents,
} from './browserInputHandlersCore.js';
import {
  applyBaseCleanupHandlers,
  getInputValue,
  hideAndDisable,
} from '../browser-core.js';
import { setInputValue } from '../inputValueStore.js';

const NUMBER_INPUT_SELECTOR = 'input[type="number"]';

const createInputElement = dom => dom.createElement('input');

const setNumberInputType = (dom, input) => dom.setType(input, 'number');

const createBaseNumberInput = dom => {
  const input = createInputElement(dom);
  setNumberInputType(dom, input);
  return input;
};

export const createNumberInput = (value, onChange, dom) => {
  const input = createBaseNumberInput(dom);
  maybeSetNumberInputValue(dom, input, value);
  setupInputEvents(dom, input, onChange);
  return input;
};

const maybeSetNumberInputValue = (dom, input, value) => {
  if (value) {
    dom.setValue(input, value);
  }
};

export const ensureNumberInput = (container, textInput, dom) => {
  const selector = NUMBER_INPUT_SELECTOR;
  const specialInput = dom.querySelector(container, selector);

  if (specialInput) {
    return specialInput;
  }

  const inputValue = getInputValue(textInput);
  const updateTextInputValue = event => {
    const targetValue = dom.getTargetValue(event);
    dom.setValue(textInput, targetValue);
    setInputValue(textInput, targetValue);
  };
  const newSpecialInput = createNumberInput(
    inputValue,
    updateTextInputValue,
    dom
  );

  insertBeforeNextSibling({
    container,
    textInput,
    element: newSpecialInput,
    dom,
  });

  return newSpecialInput;
};

/**
 * Switch the UI to use a numeric input field.
 * @param {object} dom - DOM helper utilities.
 * @param {HTMLElement} container - Container element housing the input.
 * @param {HTMLInputElement} textInput - The text input element.
 * @returns {void}
 */
export function numberHandler(dom, container, textInput) {
  hideAndDisable(textInput, dom);
  applyBaseCleanupHandlers({ container, dom });
  ensureNumberInput(container, textInput, dom);
}
