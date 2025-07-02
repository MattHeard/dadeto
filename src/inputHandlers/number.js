import {
  createNumberInput,
  createUpdateTextInputValue,
} from '../browser/toys.js';
import { maybeRemoveElement } from './disposeHelpers.js';

const positionNumberInput = ({ container, textInput, numberInput, dom }) => {
  const nextSibling = dom.getNextSibling(textInput);
  container.insertBefore(numberInput, nextSibling);
};

export const ensureNumberInput = (container, textInput, dom) => {
  let numberInput = dom.querySelector(container, 'input[type="number"]');

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

function maybeRemoveKV(container, dom) {
  const kvContainer = dom.querySelector(container, '.kv-container');
  maybeRemoveElement(kvContainer, container, dom);
}

function maybeRemoveDendrite(container, dom) {
  const dendriteForm = dom.querySelector(container, '.dendrite-form');
  maybeRemoveElement(dendriteForm, container, dom);
}

export function numberHandler(dom, container, textInput) {
  dom.hide(textInput);
  dom.disable(textInput);
  maybeRemoveKV(container, dom);
  maybeRemoveDendrite(container, dom);
  ensureNumberInput(container, textInput, dom);
}
