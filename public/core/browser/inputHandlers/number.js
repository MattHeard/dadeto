import {
  getInputValue,
  hideAndDisable,
  maybeRemoveDendrite,
  maybeRemoveKV,
  maybeRemoveTextarea,
} from '../browser-core.js';
import {
  createContainerHandlerInvoker,
  createInputDisposer,
  createSpecialInputFactory,
} from './browserInputHandlersCore.js';

const NUMBER_INPUT_SELECTOR = 'input[type="number"]';

const createInputElement = dom => dom.createElement('input');

const setNumberInputType = (dom, input) => dom.setType(input, 'number');

const createBaseNumberInput = dom => {
  const input = createInputElement(dom);
  setNumberInputType(dom, input);
  return input;
};

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

const positionSpecialInput = ({ container, textInput, specialInput, dom }) => {
  const nextSibling = dom.getNextSibling(textInput);
  container.insertBefore(specialInput, nextSibling);
};

const createNumberSpecialInputFactory = (textInput, dom) =>
  createSpecialInputFactory({
    textInput,
    dom,
    createNumberInput,
    getValue: getInputValue,
  });

export const ensureNumberInput = (container, textInput, dom) => {
  const selector = NUMBER_INPUT_SELECTOR;
  const specialInput = dom.querySelector(container, selector);

  if (specialInput) {
    return specialInput;
  }

  const newSpecialInput = createNumberSpecialInputFactory(textInput, dom)();

  positionSpecialInput({
    container,
    textInput,
    specialInput: newSpecialInput,
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
  const containerHandlers = [
    maybeRemoveKV,
    maybeRemoveDendrite,
    maybeRemoveTextarea,
  ];
  const invokeContainerHandler = createContainerHandlerInvoker(container, dom);
  containerHandlers.forEach(invokeContainerHandler);
  ensureNumberInput(container, textInput, dom);
}
