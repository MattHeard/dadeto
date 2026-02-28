import * as browserCore from '../browser-core.js';
import {
  appendLabelledField,
  cleanContainer,
  createManagedFormShell,
  registerInputListener,
  syncHiddenInput,
} from './createDendriteHandler.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */
/** @typedef {{ title: string, existingKeys: string[] }} BlogKeyData */
/** @typedef {() => void} Disposer */

const TEXTAREA_CLASS = 'toy-textarea';

/**
 * Extract the title string from a parsed object, defaulting to empty string.
 * @param {object} parsed - Parsed input object.
 * @returns {string} Title string or empty string.
 */
function parseTitle(parsed) {
  if (typeof (/** @type {any} */ (parsed).title) === 'string') {
    return /** @type {any} */ (parsed).title;
  }
  return '';
}

/**
 * Parse stored JSON into a BlogKeyData object with safe defaults.
 * @param {DOMHelpers} dom - DOM helpers.
 * @param {HTMLInputElement} textInput - Hidden input holding serialized data.
 * @returns {BlogKeyData} Parsed data with safe defaults.
 */
function parseData(dom, textInput) {
  const raw = browserCore.getInputValue(textInput) || '{}';
  const parsed = browserCore.parseJsonOrDefault(raw, {});
  return {
    title: parseTitle(parsed),
    existingKeys: browserCore.parseExistingKeys(parsed),
  };
}

/**
 * Parse newline-separated textarea content into a trimmed, non-empty string array.
 * @param {string | number | boolean | string[] | FileList | null | undefined} value - Raw textarea value.
 * @returns {string[]} Parsed lines.
 */
function parseLines(value) {
  return String(value ?? '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Wire input events for a field and append it as a labelled row.
 * @param {{ dom: DOMHelpers, form: HTMLElement, element: HTMLElement, labelText: string, onInput: () => void, disposers: Disposer[] }} options - Wiring dependencies.
 * @returns {void}
 */
function wireField({ dom, form, element, labelText, onInput, disposers }) {
  registerInputListener({ dom, input: element, handler: onInput, disposers });
  appendLabelledField({ dom, form, labelText, input: element });
}

/**
 * Build and wire the title text input.
 * @param {{ dom: DOMHelpers, form: HTMLElement, data: BlogKeyData, textInput: HTMLInputElement, disposers: Disposer[] }} options - Field construction dependencies.
 * @returns {void}
 */
function buildTitleField({ dom, form, data, textInput, disposers }) {
  const input = /** @type {HTMLInputElement} */ (dom.createElement('input'));
  dom.setType(input, 'text');
  dom.setPlaceholder(input, 'Blog post title');
  dom.setValue(input, data.title);
  const onInput = () => {
    data.title = String(dom.getValue(input));
    syncHiddenInput(dom, textInput, data);
  };
  wireField({
    dom,
    form,
    element: input,
    labelText: 'title',
    onInput,
    disposers,
  });
}

/**
 * Build and wire the existingKeys textarea (one key per line).
 * @param {{ dom: DOMHelpers, form: HTMLElement, data: BlogKeyData, textInput: HTMLInputElement, disposers: Disposer[] }} options - Field construction dependencies.
 * @returns {void}
 */
function buildExistingKeysField({ dom, form, data, textInput, disposers }) {
  const textarea = /** @type {HTMLTextAreaElement} */ (
    dom.createElement('textarea')
  );
  dom.setClassName(textarea, TEXTAREA_CLASS);
  dom.setPlaceholder(textarea, 'GERM1\nTEXT1\nSTAR1');
  dom.setValue(textarea, data.existingKeys.join('\n'));
  const onInput = () => {
    data.existingKeys = parseLines(dom.getValue(textarea));
    syncHiddenInput(dom, textInput, data);
  };
  wireField({
    dom,
    form,
    element: textarea,
    labelText: 'existingKeys (one per line)',
    onInput,
    disposers,
  });
}

/**
 * Create, insert, and wire the blog-key form.
 * @param {{ dom: DOMHelpers, container: HTMLElement, textInput: HTMLInputElement }} options - Form construction dependencies.
 * @returns {HTMLElement} The created form element.
 */
function buildForm({ dom, container, textInput }) {
  const data = parseData(dom, textInput);
  /** @type {Disposer[]} */
  const disposers = [];
  const form = createManagedFormShell({
    dom,
    container,
    textInput,
    disposers,
  });
  buildTitleField({ dom, form, data, textInput, disposers });
  buildExistingKeysField({ dom, form, data, textInput, disposers });

  syncHiddenInput(dom, textInput, data);

  return form;
}

/**
 * Switch the UI to a blog-key form with title and existingKeys fields.
 * @param {DOMHelpers} dom - DOM helper utilities.
 * @param {HTMLElement} container - Container element housing the input.
 * @param {HTMLInputElement} textInput - The hidden text input element.
 * @returns {void}
 */
export function blogKeyHandler(dom, container, textInput) {
  browserCore.hideAndDisable(textInput, dom);
  cleanContainer(dom, container);
  buildForm({ dom, container, textInput });
}
