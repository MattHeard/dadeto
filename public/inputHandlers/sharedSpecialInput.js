import { insertBeforeNextSibling } from './browserInputHandlersCore.js';

/**
 * Capture the DOM helpers and wiring identifiers shared across special input helpers.
 * @param {{selector: string, container: HTMLElement, textInput: HTMLElement, dom: object}} params - Shared configuration.
 * @returns {{selector: string, container: HTMLElement, textInput: HTMLElement, dom: object}} Shared subset.
 */
function getSharedSpecialInputContext(params) {
  const { selector, container, textInput, dom } = params;
  return { selector, container, textInput, dom };
}

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
 * @param {object} options Helper configuration.
 * @param {string} options.selector Selector to locate an existing element.
 * @param {HTMLElement} options.container Container that wraps the input.
 * @param {HTMLElement} options.textInput Underlying text input element.
 * @param {object} options.dom DOM helper utilities.
 * @param {() => HTMLElement} options.createSpecialInput Factory that produces the new special input.
 * @param {HTMLElement | null | undefined} [options.existingSpecialInput] Optional element already located by the caller.
 * @returns {HTMLElement} Reused or newly created special input.
 */
export function ensureSpecialInput(options) {
  const { createSpecialInput, existingSpecialInput } = options;
  const sharedInput = getSharedSpecialInputContext(options);
  const specialInput =
    existingSpecialInput ??
    sharedInput.dom.querySelector(sharedInput.container, sharedInput.selector);

  return reuseOrInsertSpecialInput({
    ...sharedInput,
    specialInput,
    createSpecialInput,
  });
}

/**
 * Create a helper that caches the pre-existing special input and provides an ensure function.
 * @param {object} options Helper configuration.
 * @param {string} options.selector Selector to locate an existing element.
 * @param {HTMLElement} options.container Container that wraps the input.
 * @param {HTMLElement} options.textInput Underlying text input element.
 * @param {object} options.dom DOM helper utilities.
 * @returns {{
 *   existingSpecialInput: HTMLElement | null,
 *   ensure: (createSpecialInput: () => HTMLElement) => HTMLElement,
 * }} Wrapper exposing the existing element and an ensure helper.
 */
export function createSpecialInputEnsurer(options) {
  const sharedInput = getSharedSpecialInputContext(options);
  const existingSpecialInput = sharedInput.dom.querySelector(
    sharedInput.container,
    sharedInput.selector
  );

  return {
    existingSpecialInput,
    ensure(createSpecialInput) {
      return ensureSpecialInput({
        ...sharedInput,
        existingSpecialInput,
        createSpecialInput,
      });
    },
  };
}
