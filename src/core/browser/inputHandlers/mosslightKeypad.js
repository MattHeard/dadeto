import { createCaptureForm, syncToyPayload } from './captureFormShared.js';

const FORM_CLASS = 'mosslight-keypad-form';
const GROUPS = [
  {
    className: 'mosslight-keypad-dpad',
    controls: [
      { label: '▲', key: 'ArrowUp', name: 'Up', position: 'up' },
      { label: '◀', key: 'ArrowLeft', name: 'Left', position: 'left' },
      { label: '▼', key: 'ArrowDown', name: 'Down', position: 'down' },
      { label: '▶', key: 'ArrowRight', name: 'Right', position: 'right' },
    ],
  },
  {
    className: 'mosslight-keypad-face',
    controls: [
      { label: 'B', key: 'x', name: 'B · cancel', position: 'b' },
      { label: 'A', key: 'z', name: 'A · talk or confirm', position: 'a' },
    ],
  },
  {
    className: 'mosslight-keypad-system',
    controls: [
      { label: 'SELECT', key: 't', name: 'Select · wait', position: 'select' },
      { label: 'START', key: 'j', name: 'Start · journal', position: 'start' },
    ],
  },
];

/**
 * Render an accessible, touch-first handheld keypad for the Mosslight toy.
 * @param {import('../domHelpers.js').DOMHelpers} dom - DOM helpers.
 * @param {HTMLElement} container - Input-method container.
 * @param {HTMLInputElement | null} textInput - Hidden input consumed by the toy.
 * @returns {void}
 */
export function mosslightKeypadHandler(dom, container, textInput) {
  const fieldContainer = /** @type {HTMLElement} */ (
    dom.getParentElement(container) || container
  );
  const gameInput = /** @type {HTMLInputElement} */ (
    textInput || dom.querySelector(fieldContainer, 'input[type="text"]')
  );
  const article = /** @type {HTMLElement} */ (
    container.closest?.('article.entry') || fieldContainer
  );
  const autoSubmitCheckbox = /** @type {HTMLInputElement | null} */ (
    dom.querySelector(article, '.auto-submit-checkbox')
  );
  createCaptureForm({
    dom,
    container,
    textInput: /** @type {HTMLInputElement} */ (dom.createElement('input')),
    formClass: `${FORM_CLASS} dendrite-form`,
    onFormReady: ({ form, button, cleanupFns }) => {
      dom.setTextContent(button, 'Virtual keypad');
      button.setAttribute('hidden', 'hidden');
      const keypad = dom.createElement('div');
      dom.setClassName(keypad, 'mosslight-keypad');
      keypad.setAttribute('aria-label', 'Mosslight Valley virtual keypad');
      dom.appendChild(form, keypad);

      for (const group of GROUPS) {
        const groupElement = dom.createElement('div');
        dom.setClassName(groupElement, group.className);
        dom.appendChild(keypad, groupElement);
        for (const control of group.controls) {
          const controlButton = /** @type {HTMLButtonElement} */ (
            dom.createElement('button')
          );
          dom.setType(controlButton, 'button');
          dom.setClassName(
            controlButton,
            `mosslight-keypad-button ${control.position}`
          );
          dom.setTextContent(controlButton, control.label);
          controlButton.setAttribute('aria-label', control.name);
          controlButton.setAttribute('data-key', control.key);
          dom.addEventListener(controlButton, 'click', () => {
            const input = { dom, textInput: gameInput, autoSubmitCheckbox };
            syncToyPayload(input, { type: 'keydown', key: control.key });
            dom.requestAnimationFrame(() =>
              syncToyPayload(input, { type: 'keyup', key: control.key })
            );
          });
          dom.appendChild(groupElement, controlButton);
        }
      }
      cleanupFns.push(() => dom.removeChild(form, keypad));
    },
  });
}
