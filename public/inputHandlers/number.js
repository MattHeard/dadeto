import {
  createRemoveListener,
  getInputValue,
  hideAndDisable,
  maybeRemoveDendrite,
  maybeRemoveKV,
  maybeRemoveTextarea,
  setInputValue,
} from '../browser-core.js';

const NUMBER_INPUT_SELECTOR = 'input[type="number"]';

const createBaseNumberInput = dom => {
  const input = dom.createElement('input');
  dom.setType(input, 'number');
  return input;
};

const setupInputEvents = (input, onChange, dom) => {
  dom.addEventListener(input, 'input', onChange);
  input._dispose = createRemoveListener({
    dom,
    el: input,
    event: 'input',
    handler: onChange,
  });
};

export const createNumberInput = (value, onChange, dom) => {
  const input = createBaseNumberInput(dom);
  if (value) {
    dom.setValue(input, value);
  }
  setupInputEvents(input, onChange, dom);
  return input;
};

export const createUpdateTextInputValue = (textInput, dom) => event => {
  const targetValue = dom.getTargetValue(event);
  dom.setValue(textInput, targetValue);
  setInputValue(textInput, targetValue);
};

const positionNumberInput = ({ container, textInput, numberInput, dom }) => {
  const nextSibling = dom.getNextSibling(textInput);
  container.insertBefore(numberInput, nextSibling);
};

export const ensureNumberInput = (container, textInput, dom) => {
  let numberInput = dom.querySelector(container, NUMBER_INPUT_SELECTOR);

  if (!numberInput) {
    numberInput = createNumberInput(
      getInputValue(textInput),
      createUpdateTextInputValue(textInput, dom),
      dom
    );
    positionNumberInput({
      container,
      textInput,
      numberInput,
      dom,
    });
  }

  return numberInput;
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
  maybeRemoveKV(container, dom);
  maybeRemoveDendrite(container, dom);
  maybeRemoveTextarea(container, dom);
  ensureNumberInput(container, textInput, dom);
}
