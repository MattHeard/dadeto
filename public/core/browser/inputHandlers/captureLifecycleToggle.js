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
 *   onStart?: (globalThis: typeof globalThis) => void,
 *   onStop?: (globalThis: typeof globalThis) => void,
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
    emitCaptureLifecycleToggle(options, capturing);
  };
}

/**
 * Emit the capture lifecycle state and notify the matching hook.
 * @param {CaptureLifecycleToggleOptions} options - UI and lifecycle dependencies.
 * @param {boolean} capturing - Whether capture is active.
 */
function emitCaptureLifecycleToggle(options, capturing) {
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

  notifyCaptureLifecycleToggle(options, capturing);
}

/**
 * Notify the start/stop hook for the current capture state.
 * @param {CaptureLifecycleToggleOptions} options - UI and lifecycle dependencies.
 * @param {boolean} capturing - Whether capture is active.
 */
function notifyCaptureLifecycleToggle(options, capturing) {
  const lifecycleHook = { true: options.onStart, false: options.onStop }[
    capturing
  ];
  if (capturing) {
    lifecycleHook?.(globalThis);
    return;
  }

  const cancelAnimationFrame = globalThis.cancelAnimationFrame;
  if (typeof cancelAnimationFrame === 'function') {
    lifecycleHook?.(globalThis);
    return;
  }

  lifecycleHook?.({
    cancelAnimationFrame: () => {},
  });
}
