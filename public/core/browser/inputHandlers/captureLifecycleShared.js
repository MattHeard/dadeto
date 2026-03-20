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
 * @param {DOMHelpers} dom - DOM helper utilities.
 * @param {HTMLButtonElement} button - Capture button element.
 * @param {boolean} isCapturing - Whether capture is active.
 * @param {string} captureLabel - Label shown while capture is idle.
 * @param {string} releaseLabel - Label shown while capture is active.
 * @returns {void}
 */
export function updateCaptureButtonLabel(
  dom,
  button,
  isCapturing,
  captureLabel,
  releaseLabel
) {
  dom.setTextContent(button, isCapturing ? releaseLabel : captureLabel);
}

/**
 * Mirror capture state changes to the UI and hidden toy input.
 * @param {CaptureLifecycleOptions} options - Shared UI and syncing dependencies.
 * @param {boolean} capturing - The capture state being broadcast.
 * @returns {void}
 */
export function emitCaptureState(options, capturing) {
  options.updateButtonLabel(options.dom, options.button, capturing);
  options.emitPayload(
    {
      dom: options.dom,
      textInput: options.textInput,
      autoSubmitCheckbox: options.autoSubmitCheckbox,
    },
    {
      type: 'capture',
      capturing,
    }
  );
}
