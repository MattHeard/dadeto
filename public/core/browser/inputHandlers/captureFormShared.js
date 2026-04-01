import * as browserCore from '../browser-core.js';
import { createManagedFormShellState } from './createDendriteHandler.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */
/** @typedef {(globalThis: typeof globalThis) => void} CleanupFn */

/**
 * @typedef {{
 *   dom: DOMHelpers,
 *   button: HTMLButtonElement,
 *   container: HTMLElement,
 *   textInput: HTMLInputElement,
 *   cleanupFns: CleanupFn[],
 * }} CaptureFormContext
 */

const AUTO_SUBMIT_CHECKBOX_SELECTOR = '.auto-submit-checkbox';

/**
 * Serialize an event payload for the hidden text input.
 * @param {Record<string, unknown>} payload - Structured event payload to store.
 * @returns {string} JSON-encoded event payload.
 */
export function serializePayload(payload) {
  return JSON.stringify(payload);
}

/**
 * Dispatch a change event on the given checkbox.
 * @param {HTMLInputElement} checkbox - Checkbox that should emit a change event.
 * @returns {void}
 */
export function dispatchCheckboxChange(checkbox) {
  const dispatchEvent = checkbox.dispatchEvent;
  if (typeof dispatchEvent !== 'function') {
    return;
  }

  dispatchEvent.call(checkbox, new Event('change'));
}

/**
 * Mark the paired toy as auto-submitting when the checkbox exists.
 * @param {HTMLInputElement | null} autoSubmitCheckbox - Checkbox controlling auto-submit.
 * @returns {void}
 */
export function enableAutoSubmit(autoSubmitCheckbox) {
  if (autoSubmitCheckbox === null) {
    return;
  }

  autoSubmitCheckbox.checked = true;
  dispatchCheckboxChange(autoSubmitCheckbox);
}

/**
 * Mirror a structured payload into the hidden toy input.
 * @param {{
 *   dom: DOMHelpers,
 *   textInput: HTMLInputElement,
 *   autoSubmitCheckbox: HTMLInputElement | null,
 *   payload: Record<string, unknown>,
 * }} options - DOM and payload dependencies.
 * @returns {void}
 */
export function syncToyInput({ dom, textInput, autoSubmitCheckbox, payload }) {
  const serialised = serializePayload(payload);
  dom.setValue(textInput, serialised);
  browserCore.setInputValue(textInput, serialised);
  enableAutoSubmit(autoSubmitCheckbox);
}

/**
 * Mirror a structured payload into the hidden toy input using shared DOM dependencies.
 * @param {{
 *   dom: DOMHelpers,
 *   textInput: HTMLInputElement,
 *   autoSubmitCheckbox: HTMLInputElement | null,
 * }} input - Shared toy-input dependencies.
 * @param {Record<string, unknown>} payload - Structured event payload to store.
 * @returns {void}
 */
export function syncToyPayload(input, payload) {
  syncToyInput({
    dom: input.dom,
    textInput: input.textInput,
    autoSubmitCheckbox: input.autoSubmitCheckbox,
    payload,
  });
}

/**
 * Build the shared capture form skeleton used by keyboard and gamepad handlers.
 * @param {{ dom: DOMHelpers, container: HTMLElement, textInput: HTMLInputElement, formClass: string }} options - Setup dependencies.
 * @returns {{ form: HTMLElement, button: HTMLButtonElement, cleanupFns: CleanupFn[] }} Shared nodes and cleanup stack.
 */
export function buildCaptureForm({ dom, container, textInput, formClass }) {
  const shellState = createManagedFormShellState({
    dom,
    container,
    textInput,
  });
  const { form } = shellState;
  const cleanupFns = shellState.disposers;
  dom.setClassName(form, formClass);

  const button = /** @type {HTMLButtonElement} */ (dom.createElement('button'));
  dom.setType(button, 'button');
  dom.appendChild(form, button);

  return { form, button, cleanupFns };
}

/**
 * Normalize the shared capture form context into a typed bundle.
 * @param {{
 *   dom: DOMHelpers,
 *   container: HTMLElement,
 *   textInput: HTMLInputElement,
 *   button: HTMLButtonElement,
 *   cleanupFns: CleanupFn[],
 * }} options - Shared form wiring state.
 * @returns {CaptureFormContext} Normalized context.
 */
export function getCaptureFormContext(options) {
  const { dom, button, cleanupFns, container, textInput } = options;
  return { dom, button, cleanupFns, container, textInput };
}

/**
 * @typedef {(dom: DOMHelpers, button: HTMLButtonElement, isCapturing: boolean) => void} CaptureButtonUpdater
 */

/**
 * Normalize the shared capture form context, reset its button state, and invoke a handler callback.
 * @param {{
 *   dom: DOMHelpers,
 *   container: HTMLElement,
 *   textInput: HTMLInputElement,
 *   button: HTMLButtonElement,
 *   cleanupFns: CleanupFn[],
 * }} options - Shared form wiring state.
 * @param {CaptureButtonUpdater} updateButton - Button updater used by the handler.
 * @param {(context: CaptureFormContext) => void} onReady - Callback that receives the initialized context.
 * @returns {void}
 */
export function withCaptureFormContext(options, updateButton, onReady) {
  const context = getCaptureFormContext(options);
  updateButton(context.dom, context.button, false);
  onReady(context);
}

/**
 * Create and configure a capture form instance while reusing shared DOM wiring.
 * @param {{
 *   dom: DOMHelpers,
 *   container: HTMLElement,
 *   textInput: HTMLInputElement,
 *   formClass: string,
 *   onFormReady: (context: {
 *     dom: DOMHelpers,
 *     container: HTMLElement,
 *     textInput: HTMLInputElement,
 *     form: HTMLElement,
 *     button: HTMLButtonElement,
 *     cleanupFns: CleanupFn[],
 *   }) => void,
 * }} options - Capture form wiring options.
 * @returns {HTMLElement} Rendered capture form element.
 */
export function createCaptureForm(options) {
  const { dom, container, textInput, formClass, onFormReady } = options;
  const { form, button, cleanupFns } = buildCaptureForm({
    dom,
    container,
    textInput,
    formClass,
  });
  onFormReady({ dom, container, textInput, form, button, cleanupFns });
  return form;
}

/**
 * Build a capture-form factory so individual handlers can share the boilerplate call.
 * @param {string} formClass - CSS class attached to the form wrapper.
 * @param {(
 *   context: {
 *     dom: DOMHelpers,
 *     container: HTMLElement,
 *     textInput: HTMLInputElement,
 *     form: HTMLElement,
 *     button: HTMLButtonElement,
 *     cleanupFns: CleanupFn[],
 *   }
 * ) => void} onFormReady - Handler-specific wiring that runs after the form is created.
 * @returns {(options: { dom: DOMHelpers, container: HTMLElement, textInput: HTMLInputElement }) => HTMLElement} Factory that renders the configured form.
 */
export function makeCaptureFormBuilder(formClass, onFormReady) {
  return ({ dom, container, textInput }) =>
    createCaptureForm({ dom, container, textInput, formClass, onFormReady });
}

/**
 * Prepare the shared capture handler UI before the specific form is mounted.
 * @param {{ dom: DOMHelpers, container: HTMLElement, textInput: HTMLInputElement }} options - Handler entry dependencies.
 * @returns {void}
 */
export function prepareCaptureHandler({ dom, container, textInput }) {
  browserCore.hideAndDisable(textInput, dom);
  browserCore.applyBaseCleanupHandlers({
    container,
    dom,
    extraHandlers: [browserCore.maybeRemoveNumber],
  });
}

/**
 * Resolve the article wrapper for the current container.
 * @param {HTMLElement} container - Input container inside the article.
 * @returns {HTMLElement | null} Closest article element.
 */
export function getArticle(container) {
  return /** @type {HTMLElement | null} */ (container.closest('article.entry'));
}

/**
 * Find the article-level auto-submit checkbox associated with the toy.
 * @param {HTMLElement} container - Input container inside the article.
 * @param {DOMHelpers} dom - DOM helper utilities.
 * @returns {HTMLInputElement | null} Matching checkbox when present.
 */
export function getAutoSubmitCheckbox(container, dom) {
  const article = getArticle(container);
  if (!article) {
    return null;
  }

  return /** @type {HTMLInputElement | null} */ (
    dom.querySelector(article, AUTO_SUBMIT_CHECKBOX_SELECTOR)
  );
}

/**
 * Register a global event listener that automatically records cleanup.
 * @param {{
 *   globalThisArg: typeof globalThis,
 *   cleanupFns: CleanupFn[],
 *   type: string,
 *   handler: (event: Event) => void,
 * }} options - Listener wiring options.
 * @returns {void}
 */
export function registerGlobalListener({
  cleanupFns,
  globalThisArg,
  type,
  handler,
}) {
  globalThisArg.addEventListener(type, handler);
  cleanupFns.push(globalThisArg =>
    globalThisArg.removeEventListener(type, handler)
  );
}
