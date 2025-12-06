import {
  createRemoveListener,
  getInputValue,
  hideAndDisable,
  maybeRemoveDendrite,
  maybeRemoveKV,
  maybeRemoveTextarea,
} from '../browser-core.js';
import {
  createContainerHandlerInvoker,
  createUpdateTextInputValue,
} from './browserInputHandlersCore.js';

const NUMBER_INPUT_SELECTOR = 'input[type="number"]';

const createInputElement = dom => dom.createElement('input');

const setNumberInputType = (dom, input) => dom.setType(input, 'number');

const createBaseNumberInput = dom => {
  const input = createInputElement(dom);
  setNumberInputType(dom, input);
  return input;
};

const createInputDisposer = (dom, input, onChange) =>
  createRemoveListener({
    dom,
    el: input,
    event: 'input',
    handler: onChange,
  });

const addInputListener = (dom, input, onChange) =>
  dom.addEventListener(input, 'input', onChange);

const setupInputEvents = (input, onChange, dom) => {
  addInputListener(dom, input, onChange);
  input._dispose = createInputDisposer(dom, input, onChange);
};

export const createNumberInput = (value, onChange, dom) => {
  const input = createBaseNumberInput(dom);
  maybeSetNumberInputValue(dom, input, value);
  setupInputEvents(input, onChange, dom);
  return input;
};

const maybeSetNumberInputValue = (dom, input, value) => {
  if (value) {
    dom.setValue(input, value);
  }
};

const positionNumberInput = ({ container, textInput, numberInput, dom }) => {
  const nextSibling = dom.getNextSibling(textInput);
  container.insertBefore(numberInput, nextSibling);
};

const queryNumberInput = (dom, container) =>
  dom.querySelector(container, NUMBER_INPUT_SELECTOR);

const createAndPositionNumberInput = (container, textInput, dom) => {
  const numberInput = createNumberInput(
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

  return numberInput;
};

export const ensureNumberInput = (container, textInput, dom) => {
  const numberInput = queryNumberInput(dom, container);

  if (!numberInput) {
    return createAndPositionNumberInput(container, textInput, dom);
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
  const containerHandlers = [
    maybeRemoveKV,
    maybeRemoveDendrite,
    maybeRemoveTextarea,
  ];
  const invokeContainerHandler = createContainerHandlerInvoker(container, dom);
  containerHandlers.forEach(invokeContainerHandler);
  ensureNumberInput(container, textInput, dom);
}
