import * as browserCore from '../browser-core.js';
import {
  createUpdateTextInputValue,
  revealAndEnable,
  setupInputEvents,
} from './browserInputHandlersCore.js';
import { createSpecialInputEnsurer } from './sharedSpecialInput.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */

const TEXTAREA_SELECTOR = '.toy-textarea';
const TEXTAREA_CLASS = TEXTAREA_SELECTOR.slice(1);

/**
 * Normalize potentially empty values to a string.
 * @param {string | number | boolean | string[] | FileList | null | undefined} value - Input value.
 * @returns {string} Normalized string.
 */
const toNonEmptyString = value => {
  if (value) {
    return String(value);
  }

  return '';
};

/**
 * Read a value from the textarea via DOM helpers.
 * @param {HTMLInputElement} textInput - Hidden text input element.
 * @param {DOMHelpers} dom - DOM helpers.
 * @returns {string} Current textarea value.
 */
const getDomTextareaValue = (textInput, dom) => {
  if (!canReadTextareaValue(dom)) {
    return '';
  }

  return toNonEmptyString(dom.getValue(textInput));
};

/**
 * Check the DOM helpers for value access support.
 * @param {DOMHelpers} dom - DOM helpers.
 * @returns {boolean} True when getValue is available.
 */
const canReadTextareaValue = dom =>
  Boolean(dom) && typeof dom.getValue === 'function';

/**
 * Determine the source value for a textarea.
 * @param {HTMLInputElement} textInput - Hidden text input element.
 * @param {DOMHelpers} dom - DOM helpers.
 * @returns {string} Source value for the textarea.
 */
const getTextareaSourceValue = (textInput, dom) => {
  const storedValue = browserCore.getInputValue(textInput);
  if (storedValue) {
    return storedValue;
  }

  return getDomTextareaValue(textInput, dom);
};

/**
 * Attach listeners to keep the textarea and hidden input in sync.
 * @param {{ textarea: HTMLTextAreaElement, textInput: HTMLInputElement, dom: DOMHelpers }} options - Wiring dependencies.
 * @returns {void}
 */
const setupTextarea = ({ textarea, textInput, dom }) => {
  const handleInput = createUpdateTextInputValue(textInput, dom);
  setupInputEvents(dom, textarea, handleInput);
};

/**
 * Determine whether to set the textarea value.
 * @param {HTMLTextAreaElement | null | undefined} specialInput - Existing textarea element.
 * @param {string | number | boolean | string[] | FileList | null | undefined} value - Candidate value.
 * @returns {boolean} True when the value should be applied.
 */
const shouldSetTextareaValue = (specialInput, value) =>
  Boolean(specialInput) || Boolean(value);

/**
 * Ensure a textarea exists and is wired to the hidden input.
 * @param {HTMLElement} container - Container element.
 * @param {HTMLInputElement} textInput - Hidden text input.
 * @param {DOMHelpers} dom - DOM helpers.
 * @returns {HTMLTextAreaElement} Textarea element.
 */
export const ensureTextareaInput = (container, textInput, dom) => {
  const selector = TEXTAREA_SELECTOR;
  const { existingSpecialInput: specialInput, ensure } =
    createSpecialInputEnsurer({
      selector,
      container,
      textInput,
      dom,
    });

  const textarea = /** @type {HTMLTextAreaElement} */ (
    ensure(() => {
      const textarea = /** @type {HTMLTextAreaElement} */ (
        dom.createElement('textarea')
      );
      dom.setClassName(textarea, TEXTAREA_CLASS);
      setupTextarea({ textarea, textInput, dom });
      return textarea;
    })
  );

  const value = getTextareaSourceValue(textInput, dom);
  const textareaInput = /** @type {HTMLTextAreaElement | null} */ (
    specialInput
  );
  if (shouldSetTextareaValue(textareaInput, value)) {
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
 * @param {DOMHelpers} dom - DOM helper utilities.
 * @param {HTMLElement} container - Container element housing the input.
 * @param {HTMLInputElement} textInput - The text input element.
 * @returns {void}
 */
export function textareaHandler(dom, container, textInput) {
  cleanupTextarea(dom, container, textInput);
  ensureTextareaInput(container, textInput, dom);
}
