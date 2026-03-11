/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */

/**
 * @typedef {{
 *   dom: DOMHelpers,
 *   button: HTMLButtonElement,
 *   textInput: HTMLInputElement,
 *   autoSubmitCheckbox: HTMLInputElement | null,
 *   updateButtonLabel: (dom: DOMHelpers, button: HTMLButtonElement, capturing: boolean) => void,
 *   emitPayload: (options: {
 *     dom: DOMHelpers,
 *     textInput: HTMLInputElement,
 *     autoSubmitCheckbox: HTMLInputElement | null,
 *     payload: Record<string, unknown>,
 *   }) => void,
 * }} CaptureLifecycleOptions
 */

/**
 * Mirror capture state changes to the UI and hidden toy input.
 *
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
