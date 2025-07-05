import { DENDRITE_PAGE_FIELDS } from '../constants/dendrite.js';
import { parseJsonOrDefault } from '../utils/jsonUtils.js';
import { maybeRemoveNumber, maybeRemoveKV } from './removeElements.js';
import { DENDRITE_FORM_SELECTOR } from '../constants/selectors.js';
import { hideAndDisable } from './inputState.js';

/**
 * Call a node's _dispose method when available.
 * @param {{_dispose?: Function}} node - Node to clean up.
 * @returns {void}
 */
function disposeIfPossible(node) {
  if (typeof node._dispose === 'function') {
    node._dispose();
  }
}

/**
 * Remove any previously rendered dendrite form from the container.
 * @param {HTMLElement} container - Wrapper element.
 * @param {object} dom - DOM helpers.
 * @returns {void}
 */
function removeExistingForm(container, dom) {
  const existing = dom.querySelector(container, DENDRITE_FORM_SELECTOR);
  if (existing) {
    disposeIfPossible(existing);
    dom.removeChild(container, existing);
  }
}

/**
 * Parse JSON data stored in the hidden text input.
 * @param {object} dom - DOM utilities.
 * @param {HTMLInputElement} textInput - Hidden input element.
 * @returns {object} Parsed dendrite data.
 */
function parseDendriteData(dom, textInput) {
  const value = dom.getValue(textInput) || '{}';
  return parseJsonOrDefault(value, {});
}

/**
 * Create an input element for a given field key.
 * @param {object} dom - DOM utilities.
 * @param {string} key - Field name.
 * @returns {HTMLElement} The created element.
 */
function createInputElement(dom, key) {
  if (key === 'content') {
    return dom.createElement('textarea');
  }
  const element = dom.createElement('input');
  dom.setType(element, 'text');
  return element;
}

/**
 * Add a labeled input field to the dendrite form.
 * @param {object} dom - DOM helpers.
 * @param {HTMLElement} form - Form container.
 * @param {{key: string, placeholder: string, data: object, textInput: HTMLInputElement, disposers: Function[]}} options - Field options.
 * @returns {void}
 */
function createField(
  dom,
  form,
  { key, placeholder, data, textInput, disposers }
) {
  const wrapper = dom.createElement('div');
  const label = dom.createElement('label');
  dom.setTextContent(label, placeholder);

  const input = createInputElement(dom, key);
  dom.setPlaceholder(input, placeholder);
  if (Object.hasOwn(data, key)) {
    dom.setValue(input, data[key]);
  }
  const onInput = () => {
    data[key] = dom.getValue(input);
    dom.setValue(textInput, JSON.stringify(data));
  };
  dom.addEventListener(input, 'input', onInput);
  disposers.push(() => dom.removeEventListener(input, 'input', onInput));
  dom.appendChild(wrapper, label);
  dom.appendChild(wrapper, input);
  dom.appendChild(form, wrapper);
}

/**
 * Build the interactive dendrite form and insert it after the text input.
 * @param {object} dom - DOM utilities.
 * @param {{container: HTMLElement, textInput: HTMLInputElement, data: object, disposers: Function[]}} param1 - Configuration options.
 * @returns {HTMLElement} The created form element.
 */
function buildForm(dom, { container, textInput, data, disposers }) {
  const form = dom.createElement('div');
  dom.setClassName(form, DENDRITE_FORM_SELECTOR.slice(1));
  const nextSibling = dom.getNextSibling(textInput);
  dom.insertBefore(container, form, nextSibling);

  DENDRITE_PAGE_FIELDS.forEach(([key, placeholder]) =>
    createField(dom, form, {
      key,
      placeholder,
      data,
      textInput,
      disposers,
    })
  );

  dom.setValue(textInput, JSON.stringify(data));

  form._dispose = () => {
    disposers.forEach(fn => fn());
  };

  return form;
}

/**
 * Hide and disable the hidden JSON input element.
 * @param {object} dom - DOM helpers.
 * @param {HTMLInputElement} textInput - Input to hide.
 * @returns {void}
 */
function prepareTextInput(dom, textInput) {
  hideAndDisable(textInput, dom);
}

/**
 * Remove existing inputs and forms from the container.
 * @param {object} dom - DOM utilities.
 * @param {HTMLElement} container - Container element.
 * @returns {void}
 */
function cleanContainer(dom, container) {
  maybeRemoveNumber(container, dom);
  maybeRemoveKV(container, dom);
  removeExistingForm(container, dom);
}

/**
 * Create and insert a dendrite form for editing data.
 * @param {object} dom - DOM utilities.
 * @param {HTMLElement} container - Container to insert into.
 * @param {HTMLInputElement} textInput - Hidden JSON input.
 * @returns {HTMLElement} Newly created form.
 */
function createDendriteForm(dom, container, textInput) {
  const disposers = [];
  const data = parseDendriteData(dom, textInput);
  return buildForm(dom, { container, textInput, data, disposers });
}

/**
 * Initialize the dendrite page editor inside a container.
 * @param {object} dom - DOM utilities.
 * @param {HTMLElement} container - Element that will host the form.
 * @param {HTMLInputElement} textInput - Hidden JSON input element.
 * @returns {HTMLElement} The created form element.
 */
export function dendritePageHandler(dom, container, textInput) {
  prepareTextInput(dom, textInput);
  cleanContainer(dom, container);
  return createDendriteForm(dom, container, textInput);
}
