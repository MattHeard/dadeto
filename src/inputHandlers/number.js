import { maybeRemoveKV, maybeRemoveDendrite } from './removeElements.js';
import { NUMBER_INPUT_SELECTOR } from '../constants/selectors.js';
import { hideAndDisable } from '../utils/domUtils.js';

const createRemoveValueListener = (dom, el, handler) => () =>
  dom.removeEventListener(el, 'input', handler);

const createBaseNumberInput = dom => {
  const input = dom.createElement('input');
  dom.setType(input, 'number');
  return input;
};

const setupInputEvents = (input, onChange, dom) => {
  dom.addEventListener(input, 'input', onChange);
  input._dispose = createRemoveValueListener(dom, input, onChange);
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
};

const positionNumberInput = ({ container, textInput, numberInput, dom }) => {
  const nextSibling = dom.getNextSibling(textInput);
  container.insertBefore(numberInput, nextSibling);
};

export const ensureNumberInput = (container, textInput, dom) => {
  let numberInput = dom.querySelector(container, NUMBER_INPUT_SELECTOR);

  if (!numberInput) {
    numberInput = createNumberInput(
      textInput.value,
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

export function numberHandler(dom, container, textInput) {
  hideAndDisable(dom, textInput);
  maybeRemoveKV(container, dom);
  maybeRemoveDendrite(container, dom);
  ensureNumberInput(container, textInput, dom);
}
