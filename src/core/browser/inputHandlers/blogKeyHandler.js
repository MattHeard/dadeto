import * as browserCore from '../browser-core.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */
/** @typedef {{ title: string, existingKeys: string[] }} BlogKeyData */
/** @typedef {() => void} Disposer */

const BLOG_KEY_FORM_CLASS = browserCore.DENDRITE_FORM_SELECTOR.slice(1);
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
 * Extract the existingKeys array from a parsed object, defaulting to empty array.
 * @param {object} parsed - Parsed input object.
 * @returns {string[]} Existing keys array or empty array.
 */
function parseExistingKeys(parsed) {
  if (Array.isArray(/** @type {any} */ (parsed).existingKeys)) {
    return /** @type {any} */ (parsed).existingKeys;
  }
  return [];
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
    existingKeys: parseExistingKeys(parsed),
  };
}

/**
 * Serialize the current data state into the hidden text input.
 * @param {DOMHelpers} dom - DOM helpers.
 * @param {HTMLInputElement} textInput - Hidden input element.
 * @param {BlogKeyData} data - Current data state.
 * @returns {void}
 */
function syncHidden(dom, textInput, data) {
  const serialized = JSON.stringify(data);
  dom.setValue(textInput, serialized);
  browserCore.setInputValue(textInput, serialized);
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
 * Call the dispose method on a form element if one exists.
 * @param {HTMLElement} existing - Form element to dispose.
 * @returns {void}
 */
function disposeExisting(existing) {
  const disposer = /** @type {any} */ (existing)._dispose;
  if (typeof disposer === 'function') {
    disposer();
  }
}

/**
 * Remove any existing blog-key or dendrite form from the container.
 * @param {HTMLElement} container - Container element.
 * @param {DOMHelpers} dom - DOM helpers.
 * @returns {void}
 */
function removeBlogKeyForm(container, dom) {
  const existing = dom.querySelector(
    container,
    browserCore.DENDRITE_FORM_SELECTOR
  );
  if (existing) {
    disposeExisting(existing);
    dom.removeChild(container, existing);
  }
}

/**
 * Remove other special inputs before rendering the blog-key form.
 * @param {DOMHelpers} dom - DOM helpers.
 * @param {HTMLElement} container - Container element.
 * @returns {void}
 */
function cleanContainer(dom, container) {
  [
    browserCore.maybeRemoveNumber,
    browserCore.maybeRemoveKV,
    browserCore.maybeRemoveTextarea,
    removeBlogKeyForm,
  ].forEach(fn => fn(container, dom));
}

/**
 * Build a labelled wrapper div and append it to the form.
 * @param {{ dom: DOMHelpers, form: HTMLElement, labelText: string, input: HTMLElement }} options - Label and input to wrap.
 * @returns {void}
 */
function appendLabelledField({ dom, form, labelText, input }) {
  const wrapper = dom.createElement('div');
  const label = dom.createElement('label');
  dom.setTextContent(label, labelText);
  dom.appendChild(wrapper, label);
  dom.appendChild(wrapper, input);
  dom.appendChild(form, wrapper);
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
    syncHidden(dom, textInput, data);
  };
  dom.addEventListener(input, 'input', onInput);
  disposers.push(() => dom.removeEventListener(input, 'input', onInput));
  appendLabelledField({ dom, form, labelText: 'title', input });
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
    syncHidden(dom, textInput, data);
  };
  dom.addEventListener(textarea, 'input', onInput);
  disposers.push(() => dom.removeEventListener(textarea, 'input', onInput));
  appendLabelledField({
    dom,
    form,
    labelText: 'existingKeys (one per line)',
    input: textarea,
  });
}

/**
 * Create, insert, and wire the blog-key form.
 * @param {{ dom: DOMHelpers, container: HTMLElement, textInput: HTMLInputElement }} options - Form construction dependencies.
 * @returns {HTMLElement} The created form element.
 */
function buildForm({ dom, container, textInput }) {
  const data = parseData(dom, textInput);
  const form = /** @type {HTMLElement & { _dispose?: Disposer }} */ (
    dom.createElement('div')
  );
  dom.setClassName(form, BLOG_KEY_FORM_CLASS);
  const nextSibling = dom.getNextSibling(textInput);
  dom.insertBefore(container, form, nextSibling);

  /** @type {Disposer[]} */
  const disposers = [];
  buildTitleField({ dom, form, data, textInput, disposers });
  buildExistingKeysField({ dom, form, data, textInput, disposers });

  syncHidden(dom, textInput, data);
  form._dispose = () => disposers.forEach(fn => fn());

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
