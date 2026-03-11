import { emitCaptureState } from './captureLifecycleShared.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */
/**
 * @typedef {{
 *   dom: DOMHelpers,
 *   button: HTMLButtonElement,
 *   textInput: HTMLInputElement,
 *   autoSubmitCheckbox: HTMLInputElement | null,
 *   state: { capturing: boolean },
 *   updateButtonLabel: (dom: DOMHelpers, button: HTMLButtonElement, capturing: boolean) => void,
 *   emitPayload: (
 *     input: {
 *       dom: DOMHelpers,
 *       textInput: HTMLInputElement,
 *       autoSubmitCheckbox: HTMLInputElement | null,
 *     },
 *     payload: Record<string, unknown>
 *   ) => void,
 *   onStart?: () => void,
 *   onStop?: () => void,
 * }} CaptureLifecycleToggleOptions
 */

/**
 * Build the capture toggle handler shared by input handlers.
 * @param {CaptureLifecycleToggleOptions} options - UI and lifecycle dependencies.
 * @returns {() => void} Click handler.
 */
export function createCaptureLifecycleToggleHandler(options) {
  return () => {
    const capturing = !options.state.capturing;
    options.state.capturing = capturing;

    emitCaptureState(
      {
        dom: options.dom,
        button: options.button,
        textInput: options.textInput,
        autoSubmitCheckbox: options.autoSubmitCheckbox,
        updateButtonLabel: options.updateButtonLabel,
        emitPayload: options.emitPayload,
      },
      capturing
    );

    if (capturing) {
      options.onStart?.();
      return;
    }

    options.onStop?.();
  };
}
