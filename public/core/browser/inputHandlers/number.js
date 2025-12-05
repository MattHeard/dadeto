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

const createDomValueSetter = dom => (textInput, targetValue) => {
  dom.setValue(textInput, targetValue);
};

const createTargetApplier = textInput => targetValue => handler =>
  handler(textInput, targetValue);

const createTextInputUpdater =
  (dom, applyTargetToHandlers, updateHandlers) => event => {
    const targetValue = dom.getTargetValue(event);
    const callWithTarget = applyTargetToHandlers(targetValue);
    updateHandlers.forEach(callWithTarget);
  };

export const createUpdateTextInputValue = (textInput, dom) => {
  const setTextInputValue = createDomValueSetter(dom);
  const updateHandlers = [setTextInputValue, setInputValue];
  const applyTargetToHandlers = createTargetApplier(textInput);
  return createTextInputUpdater(dom, applyTargetToHandlers, updateHandlers);
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
