import { createCaptureToyInput } from './captureFormShared.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */

/**
 * @typedef {{
 *   dom: DOMHelpers,
 *   button: HTMLButtonElement,
 *   textInput: HTMLInputElement,
 *   autoSubmitCheckbox: HTMLInputElement | null,
 *   updateButtonLabel: (dom: DOMHelpers, button: HTMLButtonElement, capturing: boolean) => void,
 *   emitPayload: (
 *     input: {
 *       dom: DOMHelpers,
 *       textInput: HTMLInputElement,
 *       autoSubmitCheckbox: HTMLInputElement | null,
 *     },
 *     payload: Record<string, unknown>
 *   ) => void,
 * }} CaptureLifecycleOptions
 */

/**
 * Update a capture button label based on the current capture state.
 * @param {{
 *   dom: DOMHelpers,
 *   button: HTMLButtonElement,
 *   isCapturing: boolean,
 *   captureLabel: string,
 *   releaseLabel: string,
 * }} options - Capture button state and labels.
 * @returns {void}
 */
export function updateCaptureButtonLabel(options) {
  let label = options.captureLabel;
  if (options.isCapturing) {
    label = options.releaseLabel;
  }
  options.dom.setTextContent(options.button, label);
}

/**
 * Build a capture-button updater for a specific label pair.
 * @param {string} captureLabel - Label to show while capture is inactive.
 * @param {string} releaseLabel - Label to show while capture is active.
 * @returns {(dom: DOMHelpers, button: HTMLButtonElement, isCapturing: boolean) => void}
 *   Capture-button update function.
 */
export function createCaptureButtonUpdater(captureLabel, releaseLabel) {
  return (dom, button, isCapturing) => {
    updateCaptureButtonLabel({
      dom,
      button,
      isCapturing,
      captureLabel,
      releaseLabel,
    });
  };
}

/**
 * Build the shared capture lifecycle options for capture-based toys.
 * @param {{
 *   dom: DOMHelpers,
 *   button: HTMLButtonElement,
 *   textInput: HTMLInputElement,
 *   autoSubmitCheckbox: HTMLInputElement | null,
 *   updateButtonLabel: (dom: DOMHelpers, button: HTMLButtonElement, capturing: boolean) => void,
 *   emitPayload: (
 *     input: {
 *       dom: DOMHelpers,
 *       textInput: HTMLInputElement,
 *       autoSubmitCheckbox: HTMLInputElement | null,
 *     },
 *     payload: Record<string, unknown>
 *   ) => void,
 * }} options Shared capture UI dependencies.
 * @returns {{
 *   dom: DOMHelpers,
 *   button: HTMLButtonElement,
 *   textInput: HTMLInputElement,
 *   autoSubmitCheckbox: HTMLInputElement | null,
 *   updateButtonLabel: (dom: DOMHelpers, button: HTMLButtonElement, capturing: boolean) => void,
 *   emitPayload: (
 *     input: {
 *       dom: DOMHelpers,
 *       textInput: HTMLInputElement,
 *       autoSubmitCheckbox: HTMLInputElement | null,
 *     },
 *     payload: Record<string, unknown>
 *   ) => void,
 * }} Capture lifecycle options bundle.
 */
export function createCaptureLifecycleOptions(options) {
  return {
    dom: options.dom,
    button: options.button,
    textInput: options.textInput,
    autoSubmitCheckbox: options.autoSubmitCheckbox,
    updateButtonLabel: options.updateButtonLabel,
    emitPayload: options.emitPayload,
  };
}

/**
 * Build the updater used by the gamepad capture UI.
 * @returns {(dom: DOMHelpers, button: HTMLButtonElement, isCapturing: boolean) => void}
 *   Capture-button update function.
 */
export function createGamepadCaptureButtonUpdater() {
  return createCaptureButtonUpdater('Capture gamepad', 'Release gamepad');
}

/**
 * Build the updater used by the keyboard capture UI.
 * @returns {(dom: DOMHelpers, button: HTMLButtonElement, isCapturing: boolean) => void}
 *   Capture-button update function.
 */
export function createKeyboardCaptureButtonUpdater() {
  return createCaptureButtonUpdater('Capture keyboard', 'Release keyboard');
}

/**
 * Mirror capture state changes to the UI and hidden toy input.
 * @param {CaptureLifecycleOptions} options - Shared UI and syncing dependencies.
 * @param {boolean} capturing - The capture state being broadcast.
 * @returns {void}
 */
export function emitCaptureState(options, capturing) {
  options.updateButtonLabel(options.dom, options.button, capturing);
  options.emitPayload(createCaptureToyInput(options), {
    type: 'capture',
    capturing,
  });
}
