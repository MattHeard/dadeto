import * as browserCore from '../browser-core.js';
import captureLifecycleDeps from './captureLifecycleDeps.js';
import { updateCaptureButtonLabel } from './captureLifecycleShared.js';
import { isEscapeKeydown } from './escapeKey.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} KeyboardDOMHelpers */
const KEYBOARD_FORM_CLASS = browserCore.KEYBOARD_CAPTURE_FORM_SELECTOR.slice(1);
const CAPTURE_BUTTON_LABEL = 'Capture keyboard';
const RELEASE_BUTTON_LABEL = 'Release keyboard';

/**
 * Update the capture button label to reflect the current mode.
 * @param {KeyboardDOMHelpers} dom - DOM helper utilities.
 * @param {HTMLButtonElement} button - Capture button element.
 * @param {boolean} isCapturing - Whether capture is active.
 * @returns {void}
 */
function updateCaptureButton(dom, button, isCapturing) {
  updateCaptureButtonLabel({
    dom,
    button,
    isCapturing,
    captureLabel: CAPTURE_BUTTON_LABEL,
    releaseLabel: RELEASE_BUTTON_LABEL,
  });
}

/**
 * Build the global keyboard event handler.
 * @param {{
 *   dom: KeyboardDOMHelpers,
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
 *   dom: KeyboardDOMHelpers,
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
  captureLifecycleDeps.emitCaptureState(
    {
      dom,
      button,
      textInput,
      autoSubmitCheckbox,
      updateButtonLabel: updateCaptureButton,
      emitPayload: captureLifecycleDeps.syncToyPayload,
    },
    false
  );
  return true;
}

/**
 * Forward a captured keyboard event into the toy input.
 * @param {KeyboardEvent} event - Browser keyboard event.
 * @param {{
 *   dom: KeyboardDOMHelpers,
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
 *   dom: KeyboardDOMHelpers,
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
 *   dom: KeyboardDOMHelpers,
 *   textInput: HTMLInputElement,
 *   autoSubmitCheckbox: HTMLInputElement | null,
 * }} options - Keyboard forwarding dependencies.
 * @returns {void}
 */
function forwardCapturedKey(event, options) {
  captureLifecycleDeps.syncToyPayload(options, {
    type: event.type,
    key: event.key,
  });
}

/**
 * Create and wire the keyboard capture form.
 * @param {{ dom: KeyboardDOMHelpers, container: HTMLElement, textInput: HTMLInputElement }} options - Form dependencies.
 * @returns {void}
 */
const buildKeyboardCaptureFormContext = ({
  dom,
  button,
  cleanupFns,
  container,
  textInput,
}) => {
  const state = { capturing: false };
  const autoSubmitCheckbox = captureLifecycleDeps.getAutoSubmitCheckbox(
    container,
    dom
  );
  const handleToggle = captureLifecycleDeps.createCaptureLifecycleToggleHandler(
    {
      dom,
      button,
      textInput,
      autoSubmitCheckbox,
      state,
      updateButtonLabel: updateCaptureButton,
      emitPayload: captureLifecycleDeps.syncToyPayload,
    }
  );
  const handleKeyboard = createKeyboardHandler({
    dom,
    button,
    textInput,
    autoSubmitCheckbox,
    state,
  });
  const buildGlobalListenerOptions = type => ({
    globalThisArg: dom.globalThis,
    cleanupFns,
    type,
    handler: /** @type {(event: Event) => void} */ (handleKeyboard),
  });

  dom.addEventListener(button, 'click', handleToggle);
  captureLifecycleDeps.registerGlobalListener(
    buildGlobalListenerOptions('keydown')
  );
  captureLifecycleDeps.registerGlobalListener(
    buildGlobalListenerOptions('keyup')
  );

  cleanupFns.push(() => dom.removeEventListener(button, 'click', handleToggle));
};

const buildKeyboardCaptureForm = captureLifecycleDeps.makeCaptureFormBuilder(
  KEYBOARD_FORM_CLASS,
  options =>
    captureLifecycleDeps.withCaptureFormContext(
      options,
      updateCaptureButton,
      buildKeyboardCaptureFormContext
    )
);

/**
 * Switch the UI to the keyboard capture controller.
 * @param {KeyboardDOMHelpers} dom - DOM helper utilities.
 * @param {HTMLElement} container - Container element for the toy input.
 * @param {HTMLInputElement} textInput - Hidden text input used by auto-submit.
 * @returns {void}
 */
export function keyboardCaptureHandler(dom, container, textInput) {
  captureLifecycleDeps.prepareCaptureHandler({ dom, container, textInput });
  buildKeyboardCaptureForm({ dom, container, textInput });
}
