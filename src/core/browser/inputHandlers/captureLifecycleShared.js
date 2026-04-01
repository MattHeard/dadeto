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
