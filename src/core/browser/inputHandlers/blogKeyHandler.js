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
 * Run a blog-key data mutation and resync the hidden payload.
 * @param {{ dom: DOMHelpers, textInput: HTMLInputElement, data: BlogKeyData, applyMutation: () => void }} options Update inputs.
 * @returns {void}
 */
function updateBlogKeyData({ dom, textInput, data, applyMutation }) {
  applyMutation();
  syncHiddenInput(dom, textInput, data);
}

/**
 * Build and wire a blog-key field using the shared labelled-field flow.
 * @param {{
 *   dom: DOMHelpers,
 *   form: HTMLElement,
 *   textInput: HTMLInputElement,
 *   data: BlogKeyData,
 *   disposers: Disposer[],
 *   element: HTMLElement,
 *   initialValue: string,
 *   labelText: string,
 *   configureElement: (element: HTMLElement) => void,
 *   updateData: () => void
 * }} options Field configuration.
 * @returns {void}
 */
function buildBlogKeyField(options) {
  const {
    dom,
    form,
    textInput,
    data,
    disposers,
    element,
    initialValue,
    labelText,
    configureElement,
    updateData,
  } = options;
  configureElement(element);
  dom.setValue(element, initialValue);
  const onInput = () =>
    updateBlogKeyData({ dom, textInput, data, applyMutation: updateData });
  wireField({
    dom,
    form,
    element,
    labelText,
    onInput,
    disposers,
  });
}

/**
 * Create the field definitions used by the blog-key form.
 * @param {{ dom: DOMHelpers, data: BlogKeyData }} options Field-definition collaborators.
 * @returns {Array<Omit<Parameters<typeof buildBlogKeyField>[0], 'form' | 'textInput' | 'disposers' | 'data'>>} Blog-key field definitions.
 */
function createBlogKeyFields({ dom, data }) {
  const titleInput = /** @type {HTMLInputElement} */ (
    dom.createElement('input')
  );
  const textarea = /** @type {HTMLTextAreaElement} */ (
    dom.createElement('textarea')
  );
  return [
    {
      dom,
      element: titleInput,
      initialValue: data.title,
      labelText: 'title',
      configureElement: field => {
        dom.setType(/** @type {HTMLInputElement} */ (field), 'text');
        dom.setPlaceholder(field, 'Blog post title');
      },
      updateData: () => {
        data.title = String(dom.getValue(titleInput));
      },
    },
    {
      dom,
      element: textarea,
      initialValue: data.existingKeys.join('\n'),
      labelText: 'existingKeys (one per line)',
      configureElement: field => {
        dom.setClassName(field, TEXTAREA_CLASS);
        dom.setPlaceholder(field, 'GERM1\nTEXT1\nSTAR1');
      },
      updateData: () => {
        data.existingKeys = parseLines(dom.getValue(textarea));
      },
    },
  ];
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
  const fieldDefinitions = createBlogKeyFields({ dom, data });
  fieldDefinitions.forEach(field =>
    buildBlogKeyField({
      ...field,
      form,
      textInput,
      data,
      disposers,
    })
  );

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
