import * as browserCore from '../browser-core.js';
import { whenOrDefault } from '../../commonCore.js';
import {
  finalizeManagedForm,
  applyMutationAndSyncHiddenInput,
  wireLabelledField,
  runFormHandler,
  withManagedFormShell,
} from './createDendriteHandler.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */
/** @typedef {{ title: string, existingKeys: string[] }} BlogKeyData */
/** @typedef {() => void} Disposer */

const TEXTAREA_CLASS = 'toy-textarea';
const EMPTY_TEXT = String();
const LINE_BREAK = String.fromCharCode(10);
const TEXT_INPUT_TYPE = String.fromCharCode(116, 101, 120, 116);
const TITLE_LABEL = 'title';
const TITLE_PLACEHOLDER = 'Blog post title';
const EXISTING_KEYS_LABEL = 'existingKeys (one per line)';
const EXISTING_KEYS_PLACEHOLDER = 'GERM1\nTEXT1\nSTAR1';

// Blog-key mutation contract begins after token cleanup.
/**
 * Extract the title string from a parsed object, defaulting to empty string.
 * @param {object} parsed - Parsed input object.
 * @returns {string} Title string or empty string.
 */
function parseTitle(parsed) {
  return whenOrDefault(
    typeof (/** @type {{ title?: unknown }} */ (parsed).title) === 'string',
    () =>
      /** @type {string} */ (/** @type {{ title: string }} */ (parsed).title),
    ''
  );
}

/**
 * Parse stored JSON into a BlogKeyData object with safe defaults.
 * @param {DOMHelpers} dom - DOM helpers.
 * @param {HTMLInputElement} textInput - Hidden input holding serialized data.
 * @returns {BlogKeyData} Parsed data with safe defaults.
 */
function parseData(dom, textInput) {
  const raw = browserCore.getInputValue(textInput);
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
  return String(value ?? EMPTY_TEXT)
    .split(LINE_BREAK)
    .map(s => s.trim())
    .filter(value => Boolean(value));
}

/**
 * Build and wire a blog-key field using the shared labelled-field flow.
 * @param {{
 *   element: HTMLInputElement | HTMLTextAreaElement,
 *   initialValue: string,
 *   labelText: string,
 *   configureElement: (element: HTMLInputElement | HTMLTextAreaElement) => void,
 *   updateData: () => void
 * }} field Field configuration.
 * @param {{ dom: DOMHelpers, form: HTMLElement, textInput: HTMLInputElement, disposers: Disposer[] }} formContext DOM and form wiring context.
 * @param {BlogKeyData} data Mutable blog-key form model.
 * @returns {void}
 */
function buildBlogKeyField(field, formContext, data) {
  const dom = formContext.dom;
  const form = formContext.form;
  const textInput = formContext.textInput;
  const disposers = formContext.disposers;
  const element = field.element;
  const initialValue = field.initialValue;
  const labelText = field.labelText;
  const configureElement = field.configureElement;
  const updateData = field.updateData;
  configureElement(element);
  dom.setValue(element, initialValue);
  const onInput = () =>
    applyMutationAndSyncHiddenInput(dom, textInput, data, updateData);
  wireLabelledField(dom, form, element, onInput)(labelText, disposers);
}

/**
 * Create the field definitions used by the blog-key form.
 * @param {{ dom: DOMHelpers, data: BlogKeyData }} options Field-definition collaborators.
 * @returns {Array<{
 *   element: HTMLInputElement | HTMLTextAreaElement,
 *   initialValue: string,
 *   labelText: string,
 *   configureElement: (field: HTMLInputElement | HTMLTextAreaElement) => void,
 *   updateData: () => void,
 * }>} Blog-key field definitions.
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
      element: titleInput,
      initialValue: data.title,
      labelText: TITLE_LABEL,
      configureElement: field => {
        dom.setType(/** @type {HTMLInputElement} */ (field), TEXT_INPUT_TYPE);
        dom.setPlaceholder(field, TITLE_PLACEHOLDER);
      },
      updateData: () => {
        data.title = String(dom.getValue(titleInput));
      },
    },
    {
      element: textarea,
      initialValue: data.existingKeys.join(LINE_BREAK),
      labelText: EXISTING_KEYS_LABEL,
      configureElement: field => {
        dom.setClassName(field, TEXTAREA_CLASS);
        dom.setPlaceholder(field, EXISTING_KEYS_PLACEHOLDER);
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
  return /** @type {HTMLElement} */ (
    withManagedFormShell(
      { dom, container, textInput },
      ({ form, disposers }) => {
        const fieldDefinitions = createBlogKeyFields({ dom, data });
        const formContext = { dom, form, textInput, disposers };
        fieldDefinitions.forEach(field =>
          buildBlogKeyField(field, formContext, data)
        );

        return finalizeManagedForm({ dom, textInput, data, form });
      }
    )
  );
}

/**
 * Switch the UI to a blog-key form with title and existingKeys fields.
 * @param {DOMHelpers} dom - DOM helper utilities.
 * @param {HTMLElement} container - Container element housing the input.
 * @param {HTMLInputElement} textInput - The hidden text input element.
 * @returns {void}
 */
export function blogKeyHandler(dom, container, textInput) {
  runFormHandler({ dom, container, textInput, buildForm });
}

export const blogKeyHandlerTestUtils = { parseLines, parseTitle };
