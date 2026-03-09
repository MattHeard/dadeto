import * as browserCore from '../browser-core.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */

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
 * Resolve the article wrapper for the current container.
 * @param {HTMLElement} container - Input container inside the article.
 * @returns {HTMLElement | null} Closest article element.
 */
export function getArticle(container) {
  const article = container.closest?.('article.entry');
  if (article) {
    return /** @type {HTMLElement} */ (article);
  }
  return null;
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
