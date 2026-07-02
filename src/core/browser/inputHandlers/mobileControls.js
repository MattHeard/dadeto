import { createCaptureForm, syncToyPayload } from './captureFormShared.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} MobileControlsDOMHelpers */
/** @typedef {() => void} CleanupFn */

const FORM_CLASS = 'mobile-controls-form';
const CONTROL_KEYS = [
  { label: 'Left', key: 'ArrowLeft' },
  { label: 'Right', key: 'ArrowRight' },
  { label: 'Launch', key: ' ' },
  { label: 'Pause', key: 'p' },
  { label: 'Reset', key: 'r' },
];

/**
 * Create a keyboard-like payload for a mobile control button.
 * @param {string} type - Key event type.
 * @param {string} key - Logical key name.
 * @returns {{ type: string, key: string }} Keyboard-style event payload.
 */
function createKeyPayload(type, key) {
  return { type, key };
}

/**
 * Wire pointer interactions for one control button.
 * @param {{
 *   dom: MobileControlsDOMHelpers,
 *   button: HTMLButtonElement,
 *   textInput: HTMLInputElement,
 *   autoSubmitCheckbox: HTMLInputElement | null,
 *   key: string,
 * }} options - Button wiring dependencies.
 * @returns {CleanupFn[]} Cleanup callbacks for the button listeners.
 */
function wireButton(options) {
  const { dom, button, textInput, autoSubmitCheckbox, key } = options;
  const cleanupFns = [];
  let pressed = false;

  /**
   * Sync a key payload to the hidden toy input.
   * @param {'keydown' | 'keyup'} type - Logical keyboard event type.
   * @returns {void}
   */
  function sync(type) {
    syncToyPayload(
      { dom, textInput, autoSubmitCheckbox },
      createKeyPayload(type, key)
    );
  }

  /**
   * Handle pointerdown on a control button.
   * @param {Event} event - Pointer press event.
   * @returns {void}
   */
  function press(event) {
    event.preventDefault?.();
    if (pressed) {
      return;
    }
    pressed = true;
    button.setAttribute('aria-pressed', 'true');
    sync('keydown');
  }

  /**
   * Handle pointer release or cancellation.
   * @param {Event} event - Pointer release event.
   * @returns {void}
   */
  function release(event) {
    event.preventDefault?.();
    if (!pressed) {
      return;
    }
    pressed = false;
    button.setAttribute('aria-pressed', 'false');
    sync('keyup');
  }

  dom.addEventListener(button, 'pointerdown', press);
  dom.addEventListener(button, 'pointerup', release);
  dom.addEventListener(button, 'pointercancel', release);
  dom.addEventListener(button, 'pointerleave', release);
  dom.addEventListener(button, 'lostpointercapture', release);
  cleanupFns.push(() => dom.removeEventListener(button, 'pointerdown', press));
  cleanupFns.push(() => dom.removeEventListener(button, 'pointerup', release));
  cleanupFns.push(() =>
    dom.removeEventListener(button, 'pointercancel', release)
  );
  cleanupFns.push(() =>
    dom.removeEventListener(button, 'pointerleave', release)
  );
  cleanupFns.push(() =>
    dom.removeEventListener(button, 'lostpointercapture', release)
  );
  return cleanupFns;
}

/**
 * Build the mobile controls form and attach the control buttons.
 * @param {{
 *   dom: MobileControlsDOMHelpers,
 *   container: HTMLElement,
 *   textInput: HTMLInputElement,
 *   form: HTMLElement,
 *   button: HTMLButtonElement,
 *   cleanupFns: CleanupFn[],
 * }} options - Form dependencies.
 * @returns {void}
 */
function buildMobileControlsFormContext(options) {
  const { dom, button, cleanupFns, form, textInput, container } = options;
  const autoSubmitCheckbox = /** @type {HTMLInputElement | null} */ (
    /** @type {unknown} */ (dom.querySelector(container, '.auto-submit-checkbox'))
  );

  dom.setTextContent(button, 'Controls');
  button.setAttribute('hidden', 'hidden');

  const controls = /** @type {HTMLElement} */ (dom.createElement('div'));
  dom.setClassName(controls, 'mobile-controls-grid');
  dom.appendChild(form, controls);

  for (const control of CONTROL_KEYS) {
    const controlButton = /** @type {HTMLButtonElement} */ (
      dom.createElement('button')
    );
    dom.setType(controlButton, 'button');
    dom.setTextContent(controlButton, control.label);
    controlButton.setAttribute('aria-pressed', 'false');
    dom.appendChild(controls, controlButton);
    cleanupFns.push(
      ...wireButton({
        dom,
        button: controlButton,
        textInput,
        autoSubmitCheckbox,
        key: control.key,
      })
    );
  }

  cleanupFns.push(() => dom.removeChild(form, controls));
}

/**
 * Build the mobile controls capture form.
 * @param {{
 *   dom: MobileControlsDOMHelpers,
 *   container: HTMLElement,
 *   textInput: HTMLInputElement,
 * }} options - Form dependencies.
 * @returns {HTMLElement} Rendered form element.
 */
function buildMobileControlsForm(options) {
  return createCaptureForm({
    ...options,
    formClass: FORM_CLASS,
    onFormReady: buildMobileControlsFormContext,
  });
}

/**
 * Switch the UI to the mobile controls input method.
 * @param {MobileControlsDOMHelpers} dom - DOM helper utilities.
 * @param {HTMLElement} container - Container element for the toy input.
 * @param {HTMLInputElement} textInput - Hidden text input used by auto-submit.
 * @returns {void}
 */
export function mobileControlsHandler(dom, container, textInput) {
  buildMobileControlsForm({ dom, container, textInput });
}
