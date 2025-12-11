import { insertBeforeNextSibling } from './browserInputHandlersCore.js';

/**
 * Reuse a special input element when present; otherwise create and insert a new one.
 * @param {object} params Helper configuration.
 * @param {HTMLElement | null | undefined} params.specialInput Candidate existing input.
 * @param {HTMLElement} params.container Container that wraps the input.
 * @param {HTMLElement} params.textInput Underlying text input element.
 * @param {object} params.dom DOM helper utilities.
 * @param {() => HTMLElement} params.createSpecialInput Factory that produces the new special input.
 * @returns {HTMLElement} Reused or newly created special input.
 */
export function reuseOrInsertSpecialInput({
  specialInput,
  container,
  textInput,
  dom,
  createSpecialInput,
}) {
  if (specialInput) {
    return specialInput;
  }

  const element = createSpecialInput();
  insertBeforeNextSibling({ container, textInput, element, dom });
  return element;
}

/**
 * Ensure the special input exists by querying for the selector and inserting a new element when needed.
 * @param {object} params Helper configuration.
 * @param {string} params.selector Selector to locate an existing element.
 * @param {HTMLElement} params.container Container that wraps the input.
 * @param {HTMLElement} params.textInput Underlying text input element.
 * @param {object} params.dom DOM helper utilities.
 * @param {() => HTMLElement} params.createSpecialInput Factory that produces the new special input.
 * @param {HTMLElement | null | undefined} [params.existingSpecialInput] Optional element already located by the caller.
 * @returns {HTMLElement} Reused or newly created special input.
 */
export function ensureSpecialInput({
  selector,
  container,
  textInput,
  dom,
  createSpecialInput,
  existingSpecialInput,
}) {
  const specialInput =
    existingSpecialInput ?? dom.querySelector(container, selector);
  return reuseOrInsertSpecialInput({
    specialInput,
    container,
    textInput,
    dom,
    createSpecialInput,
  });
}

/**
 * Create a helper that caches the pre-existing special input and provides an ensure function.
 * @param {object} params Helper configuration.
 * @param {string} params.selector Selector to locate an existing element.
 * @param {HTMLElement} params.container Container that wraps the input.
 * @param {HTMLElement} params.textInput Underlying text input element.
 * @param {object} params.dom DOM helper utilities.
 * @returns {{
 *   existingSpecialInput: HTMLElement | null,
 *   ensure: (createSpecialInput: () => HTMLElement) => HTMLElement,
 * }} Wrapper exposing the existing element and an ensure helper.
 */
export function createSpecialInputEnsurer({
  selector,
  container,
  textInput,
  dom,
}) {
  const existingSpecialInput = dom.querySelector(container, selector);

  return {
    existingSpecialInput,
    ensure(createSpecialInput) {
      return ensureSpecialInput({
        selector,
        container,
        textInput,
        dom,
        existingSpecialInput,
        createSpecialInput,
      });
    },
  };
}
