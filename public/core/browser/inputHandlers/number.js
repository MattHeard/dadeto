import { setupInputEvents } from './browserInputHandlersCore.js';
import {
  applyBaseCleanupHandlers,
  getInputValue,
  hideAndDisable,
} from '../browser-core.js';
import { setInputValue } from '../inputValueStore.js';
import { createSpecialInputEnsurer } from './sharedSpecialInput.js';

const NUMBER_INPUT_SELECTOR = 'input[type="number"]';

/**
 * @param {import('../domHelpers.js').DOMHelpers} dom - DOM helpers.
 * @returns {HTMLInputElement} Fresh input element.
 */
const createInputElement = dom =>
  /** @type {HTMLInputElement} */ (dom.createElement('input'));

/**
 * @param {import('../domHelpers.js').DOMHelpers} dom - DOM helpers.
 * @param {HTMLInputElement} input - Input element to update.
 * @returns {void}
 */
const setNumberInputType = (dom, input) => dom.setType(input, 'number');

/**
 * @param {import('../domHelpers.js').DOMHelpers} dom - DOM helpers.
 * @returns {HTMLInputElement} Configured number input.
 */
const createBaseNumberInput = dom => {
  const input = createInputElement(dom);
  setNumberInputType(dom, input);
  return input;
};

/**
 * @param {string | number | boolean | string[] | FileList | null | undefined} value - Starting value.
 * @param {(event: unknown) => void} onChange - Input handler.
 * @param {import('../domHelpers.js').DOMHelpers} dom - DOM helpers.
 * @returns {HTMLInputElement} Initialized number input.
 */
export const createNumberInput = (value, onChange, dom) => {
  const input = createBaseNumberInput(dom);
  maybeSetNumberInputValue(dom, input, value);
  setupInputEvents(dom, input, onChange);
  return input;
};

/**
 * @param {import('../domHelpers.js').DOMHelpers} dom - DOM helpers.
 * @param {HTMLInputElement} input - Input element.
 * @param {string | number | boolean | string[] | FileList | null | undefined} value - Potential value to set.
 * @returns {void}
 */
const maybeSetNumberInputValue = (dom, input, value) => {
  if (value) {
    dom.setValue(input, value);
  }
};

/**
 * Ensure the number input exists and is wired to the text input value.
 * @param {HTMLElement} container - Container element.
 * @param {HTMLInputElement} textInput - Hidden text input.
 * @param {import('../domHelpers.js').DOMHelpers} dom - DOM helpers.
 * @returns {HTMLInputElement} Number input element.
 */
export const ensureNumberInput = (container, textInput, dom) => {
  const { ensure } = createSpecialInputEnsurer({
    selector: NUMBER_INPUT_SELECTOR,
    container,
    textInput,
    dom,
  });

  const ensuredInput = ensure(() => {
    const inputValue = getInputValue(textInput);
    /** @param {unknown} event - Input event to sync. */
    const updateTextInputValue = event => {
      const targetValue = dom.getTargetValue(
        /** @type {Event & { target: { value: string } }} */ (event)
      );
      dom.setValue(textInput, targetValue);
      setInputValue(textInput, targetValue);
    };

    return createNumberInput(inputValue, updateTextInputValue, dom);
  });
  return /** @type {HTMLInputElement} */ (ensuredInput);
};

/**
 * Switch the UI to use a numeric input field.
 * @param {import('../domHelpers.js').DOMHelpers} dom - DOM helper utilities.
 * @param {HTMLElement} container - Container element housing the input.
 * @param {HTMLInputElement} textInput - The text input element.
 * @returns {void}
 */
export function numberHandler(dom, container, textInput) {
  hideAndDisable(textInput, dom);
  applyBaseCleanupHandlers({ container, dom });
  ensureNumberInput(container, textInput, dom);
}
