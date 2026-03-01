import * as browserCore from '../browser-core.js';
import { createManagedFormShell } from './createDendriteHandler.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */
/** @typedef {() => void} CleanupFn */

const FORM_CLASS = browserCore.KEYBOARD_CAPTURE_FORM_SELECTOR.slice(1);
const CAPTURE_BUTTON_LABEL = 'Capture keyboard';
const RELEASE_BUTTON_LABEL = 'Release keyboard';
const ESCAPE_KEY = 'Escape';

/**
 * Build the JSON payload forwarded into the toy input value.
 * @param {Record<string, unknown>} payload - Serializable event payload.
 * @returns {string} Serialized payload.
 */
function serializePayload(payload) {
  return JSON.stringify(payload);
}

/**
 * Enable and trigger auto-submit when the checkbox exists.
 * @param {HTMLInputElement | null} autoSubmitCheckbox - Associated auto-submit checkbox.
 * @returns {void}
 */
function enableAutoSubmit(autoSubmitCheckbox) {
  const checkbox = autoSubmitCheckbox;
  if (!checkbox) {
    return;
  }

  triggerAutoSubmit(checkbox);
}

/**
 * Trigger auto-submit on the associated checkbox.
 * @param {HTMLInputElement} checkbox - Auto-submit checkbox.
 * @returns {void}
 */
function triggerAutoSubmit(checkbox) {
  checkbox.checked = true;
  checkbox.dispatchEvent?.(new Event('change'));
}

/**
 * Mirror a payload into the hidden text input and auto-submit checkbox.
 * @param {{
 *   dom: DOMHelpers,
 *   textInput: HTMLInputElement,
 *   autoSubmitCheckbox: HTMLInputElement | null,
 *   payload: Record<string, unknown>,
 * }} options - Synchronization dependencies.
 * @returns {void}
 */
function syncToyInput({ dom, textInput, autoSubmitCheckbox, payload }) {
  const serialised = serializePayload(payload);
  dom.setValue(textInput, serialised);
  browserCore.setInputValue(textInput, serialised);
  enableAutoSubmit(autoSubmitCheckbox);
}

/**
 * Update the capture button label to reflect the current mode.
 * @param {DOMHelpers} dom - DOM helper utilities.
 * @param {HTMLButtonElement} button - Capture button element.
 * @param {boolean} isCapturing - Whether capture is active.
 * @returns {void}
 */
function updateCaptureButton(dom, button, isCapturing) {
  let label = CAPTURE_BUTTON_LABEL;
  if (isCapturing) {
    label = RELEASE_BUTTON_LABEL;
  }
  dom.setTextContent(button, label);
}

/**
 * Resolve the article wrapper for the current container.
 * @param {HTMLElement} container - Input container inside the article.
 * @returns {HTMLElement | null} Closest article element.
 */
function getArticle(container) {
  return resolveClosestArticle(container.closest?.('article.entry'));
}

/**
 * Normalize a closest-article lookup.
 * @param {HTMLElement | null | undefined} article - Candidate article element.
 * @returns {HTMLElement | null} Closest article or null.
 */
function resolveClosestArticle(article) {
  if (article) {
    return article;
  }
  return null;
}

/**
 * Find the article-level auto-submit checkbox associated with the toy.
 * @param {HTMLElement} container - Input container inside the article.
 * @param {DOMHelpers} dom - DOM helper utilities.
 * @returns {HTMLInputElement | null} Matching checkbox when present.
 */
function getAutoSubmitCheckbox(container, dom) {
  const article = getArticle(container);
  if (!article) {
    return null;
  }

  return /** @type {HTMLInputElement | null} */ (
    dom.querySelector(article, '.auto-submit-checkbox')
  );
}

/**
 * Build the capture button click handler.
 * @param {{
 *   dom: DOMHelpers,
 *   button: HTMLButtonElement,
 *   textInput: HTMLInputElement,
 *   autoSubmitCheckbox: HTMLInputElement | null,
 *   state: { capturing: boolean },
 * }} options - Click-handler dependencies.
 * @returns {() => void} Click handler.
 */
function createCaptureToggleHandler(options) {
  const { dom, button, textInput, autoSubmitCheckbox, state } = options;
  return () => {
    state.capturing = !state.capturing;
    updateCaptureButton(dom, button, state.capturing);
    syncToyInput({
      dom,
      textInput,
      autoSubmitCheckbox,
      payload: {
        type: 'capture',
        capturing: state.capturing,
      },
    });
  };
}

/**
 * Build the global keyboard event handler.
 * @param {{
 *   dom: DOMHelpers,
 *   button: HTMLButtonElement,
 *   textInput: HTMLInputElement,
 *   autoSubmitCheckbox: HTMLInputElement | null,
 *   state: { capturing: boolean },
 * }} options - Keyboard event dependencies.
 * @returns {(event: KeyboardEvent) => void} Shared keyboard handler.
 */
function createKeyboardHandler(options) {
  return event => handleKeyboardEvent(event, options);
}

/**
 * Release capture on escape and update the toy input.
 * @param {KeyboardEvent} event - Keyboard event to inspect.
 * @param {{
 *   dom: DOMHelpers,
 *   button: HTMLButtonElement,
 *   textInput: HTMLInputElement,
 *   autoSubmitCheckbox: HTMLInputElement | null,
 *   state: { capturing: boolean },
 * }} options - Escape handling dependencies.
 * @returns {boolean} True when capture was released.
 */
function releaseCaptureOnEscape(event, options) {
  if (!isEscapeKeydown(event)) {
    return false;
  }

  const { dom, button, textInput, autoSubmitCheckbox, state } = options;
  state.capturing = false;
  updateCaptureButton(dom, button, false);
  syncToyInput({
    dom,
    textInput,
    autoSubmitCheckbox,
    payload: {
      type: 'capture',
      capturing: false,
    },
  });
  return true;
}

/**
 * Check whether the event is the escape keydown that releases capture.
 * @param {KeyboardEvent} event - Keyboard event to inspect.
 * @returns {boolean} True when the event is the escape keydown.
 */
function isEscapeKeydown(event) {
  return event.type === 'keydown' && event.key === ESCAPE_KEY;
}

/**
 * Forward a captured keyboard event into the toy input.
 * @param {KeyboardEvent} event - Browser keyboard event.
 * @param {{
 *   dom: DOMHelpers,
 *   button: HTMLButtonElement,
 *   textInput: HTMLInputElement,
 *   autoSubmitCheckbox: HTMLInputElement | null,
 *   state: { capturing: boolean },
 * }} options - Keyboard event dependencies.
 * @returns {void}
 */
function handleKeyboardEvent(event, options) {
  const capturing = options.state.capturing;
  if (!capturing) {
    return;
  }

  preventKeyboardDefault(event);
  handleCapturedKeyboardEvent(event, options);
}

/**
 * Prevent the browser default for captured keyboard events.
 * @param {KeyboardEvent} event - Browser keyboard event.
 * @returns {void}
 */
function preventKeyboardDefault(event) {
  event.preventDefault?.();
}

/**
 * Handle the captured event after the active-capture guard has passed.
 * @param {KeyboardEvent} event - Browser keyboard event.
 * @param {{
 *   dom: DOMHelpers,
 *   button: HTMLButtonElement,
 *   textInput: HTMLInputElement,
 *   autoSubmitCheckbox: HTMLInputElement | null,
 *   state: { capturing: boolean },
 * }} options - Keyboard event dependencies.
 * @returns {void}
 */
function handleCapturedKeyboardEvent(event, options) {
  const releasedCapture = releaseCaptureOnEscape(event, options);
  if (releasedCapture) {
    return;
  }
  forwardCapturedKey(event, options);
}

/**
 * Forward a non-escape keyboard event into the toy input.
 * @param {KeyboardEvent} event - Browser keyboard event.
 * @param {{
 *   dom: DOMHelpers,
 *   textInput: HTMLInputElement,
 *   autoSubmitCheckbox: HTMLInputElement | null,
 * }} options - Keyboard forwarding dependencies.
 * @returns {void}
 */
function forwardCapturedKey(event, options) {
  syncToyInput({
    dom: options.dom,
    textInput: options.textInput,
    autoSubmitCheckbox: options.autoSubmitCheckbox,
    payload: {
      type: event.type,
      key: event.key,
    },
  });
}

/**
 * Create and wire the keyboard capture form.
 * @param {{ dom: DOMHelpers, container: HTMLElement, textInput: HTMLInputElement }} options - Form dependencies.
 * @returns {HTMLElement} The inserted form element.
 */
function buildKeyboardCaptureForm({ dom, container, textInput }) {
  /** @type {CleanupFn[]} */
  const cleanupFns = [];
  const form = createManagedFormShell({
    dom,
    container,
    textInput,
    disposers: cleanupFns,
  });
  dom.setClassName(form, FORM_CLASS);

  const button = /** @type {HTMLButtonElement} */ (dom.createElement('button'));
  dom.setType(button, 'button');
  updateCaptureButton(dom, button, false);
  dom.appendChild(form, button);

  const state = { capturing: false };
  const autoSubmitCheckbox = getAutoSubmitCheckbox(container, dom);
  const handleToggle = createCaptureToggleHandler({
    dom,
    button,
    textInput,
    autoSubmitCheckbox,
    state,
  });
  const handleKeyboard = createKeyboardHandler({
    dom,
    button,
    textInput,
    autoSubmitCheckbox,
    state,
  });

  dom.addEventListener(button, 'click', handleToggle);
  globalThis.addEventListener('keydown', handleKeyboard);
  globalThis.addEventListener('keyup', handleKeyboard);

  cleanupFns.push(() => dom.removeEventListener(button, 'click', handleToggle));
  cleanupFns.push(() =>
    globalThis.removeEventListener('keydown', handleKeyboard)
  );
  cleanupFns.push(() =>
    globalThis.removeEventListener('keyup', handleKeyboard)
  );

  return form;
}

/**
 * Switch the UI to the keyboard capture controller.
 * @param {DOMHelpers} dom - DOM helper utilities.
 * @param {HTMLElement} container - Container element for the toy input.
 * @param {HTMLInputElement} textInput - Hidden text input used by auto-submit.
 * @returns {void}
 */
export function keyboardCaptureHandler(dom, container, textInput) {
  browserCore.hideAndDisable(textInput, dom);
  browserCore.applyBaseCleanupHandlers({
    container,
    dom,
    extraHandlers: [browserCore.maybeRemoveNumber],
  });
  buildKeyboardCaptureForm({ dom, container, textInput });
}
