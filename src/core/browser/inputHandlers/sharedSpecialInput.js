import { insertBeforeNextSibling } from './browserInputHandlersCore.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} DomHelpers */

/**
 * @typedef {{
 *   container: HTMLElement,
 *   textInput: HTMLInputElement,
 *   dom: DomHelpers,
 * }} SpecialInputPlacement
 */

// Special-input adapters expose only the shared DOM contract.
/**
 * @typedef {{
 *   selector: string;
 *   container: HTMLElement;
 *   textInput: HTMLInputElement;
 *   dom: DomHelpers;
 * }} SharedSpecialInputParams
 */

/** @typedef {{ selector: string, placement: SpecialInputPlacement }} SharedSpecialInputContext */

/**
 * Capture the DOM helpers and wiring identifiers shared across special input helpers.
 * @param {{
 *   selector: string,
 *   container: HTMLElement,
 *   textInput: HTMLInputElement,
 *   dom: DomHelpers,
 * }} params - Shared configuration.
 * @returns {SharedSpecialInputContext} Normalized query and placement context.
 */
function getSharedSpecialInputContext(params) {
  const { selector, container, textInput, dom } = params;
  return { selector, placement: { container, textInput, dom } };
}

/**
 * Find an existing special input using the shared DOM contract.
 * @param {SharedSpecialInputContext} sharedInput Shared input wiring values.
 * @returns {HTMLElement | null} Matching input when present.
 */
function findExistingSpecialInput(sharedInput) {
  return sharedInput.placement.dom.querySelector(
    sharedInput.placement.container,
    sharedInput.selector
  );
}

/**
 * Reuse a special input element when present; otherwise create and insert a new one.
 * @param {SpecialInputPlacement} placement DOM placement dependencies.
 * @param {HTMLElement | null | undefined} specialInput Existing special input, when available.
 * @param {() => HTMLElement} createSpecialInput Factory used when no input exists.
 * @returns {HTMLElement} Reused or newly created special input.
 */
export function reuseOrInsertSpecialInput(
  placement,
  specialInput,
  createSpecialInput
) {
  if (specialInput) {
    return specialInput;
  }

  const element = createSpecialInput();
  insertBeforeNextSibling({ ...placement, element });
  return element;
}

/**
 * Ensure the special input exists by querying for the selector and inserting a new element when needed.
 * @param {SharedSpecialInputParams & {
 *   createSpecialInput: () => HTMLElement;
 *   existingSpecialInput?: HTMLElement | null | undefined;
 * }} options Helper configuration.
 * @returns {HTMLElement} Reused or newly created special input.
 */
export function ensureSpecialInput(options) {
  const { createSpecialInput, existingSpecialInput } = options;
  const sharedInput = getSharedSpecialInputContext(options);
  const specialInput =
    existingSpecialInput ?? findExistingSpecialInput(sharedInput);

  return reuseOrInsertSpecialInput(
    sharedInput.placement,
    specialInput,
    createSpecialInput
  );
}

/**
 * Create a helper that caches the pre-existing special input and provides an ensure function.
 * @param {SharedSpecialInputParams} options Helper configuration.
 * @returns {{
 *   existingSpecialInput: HTMLElement | null,
 *   ensure: (createSpecialInput: () => HTMLElement) => HTMLElement,
 * }} Wrapper exposing the existing element and an ensure helper.
 */
export function createSpecialInputEnsurer(options) {
  const sharedInput = getSharedSpecialInputContext(options);
  const existingSpecialInput = findExistingSpecialInput(sharedInput);

  return {
    existingSpecialInput,
    ensure(createSpecialInput) {
      return reuseOrInsertSpecialInput(
        sharedInput.placement,
        existingSpecialInput,
        createSpecialInput
      );
    },
  };
}

/**
 * Create or reuse a special input in a single step.
 * @param {{ selector: string, container: HTMLElement, textInput: HTMLInputElement, dom: DomHelpers, createSpecialInput: () => HTMLElement }} options Shared input configuration.
 * @returns {HTMLElement} Reused or newly created special input.
 */
export function createOrReuseSpecialInput(options) {
  const { selector, createSpecialInput, ...sharedOptions } = options;
  return createSpecialInputEnsurer({ ...sharedOptions, selector }).ensure(
    createSpecialInput
  );
}

/**
 * Configure a special input after creating or reusing it.
 * @param {{ selector: string, container: HTMLElement, textInput: HTMLInputElement, dom: DomHelpers, createSpecialInput: () => HTMLElement, configure: (input: HTMLInputElement) => HTMLInputElement }} options Configuration and lookup dependencies.
 * @returns {HTMLInputElement} Configured input.
 */
export function ensureConfiguredSpecialInput(options) {
  const { selector, configure, ...sharedOptions } = options;
  return configure(
    /** @type {HTMLInputElement} */ (
      createOrReuseSpecialInput({ ...sharedOptions, selector })
    )
  );
}
