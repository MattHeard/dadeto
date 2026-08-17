import { hideAndDisable } from '../browser-core.js';
import { setInputValue } from '../inputValueStore.js';
import {
  createInputDisposer,
  setupInputEvents,
} from './browserInputHandlersCore.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} DomHelpers */

const FORM_SELECTOR = '.object-minute-form';

const ASSET_FIELDS = [
  ['assetId', 'Asset ID', 'text'],
  ['sku', 'SKU', 'text'],
  ['name', 'Name', 'text'],
  ['storageLocation', 'Storage location', 'text'],
  ['condition', 'Condition', 'text'],
  ['availability', 'Availability', 'text'],
  ['owner', 'Owner', 'text'],
  ['resetRequired', 'Reset required', 'checkbox'],
  ['notes', 'Notes', 'text'],
];

const REQUEST_FIELDS = [
  ['sku', 'SKU', 'text'],
  ['deliveryLocation.lat', 'Delivery latitude', 'number'],
  ['deliveryLocation.lon', 'Delivery longitude', 'number'],
  ['deliveryTime', 'Delivery time (UTC)', 'text'],
  ['pickupLocation.lat', 'Pickup latitude', 'number'],
  ['pickupLocation.lon', 'Pickup longitude', 'number'],
  ['pickupTime', 'Pickup time (UTC)', 'text'],
];

/**
 * Read a form control value.
 * @param {any} element Form control.
 * @returns {any} Normalized control value.
 */
function fieldValue(element) {
  if (element.type === 'checkbox') return element.checked;
  if (element.type === 'number')
    return element.value === '' ? null : Number(element.value);
  return element.value;
}

/**
 * Assign a value at a dotted object path.
 * @param {any} target Target object.
 * @param {string} path Dotted property path.
 * @param {any} value Value to assign.
 * @returns {void}
 */
function assignPath(target, path, value) {
  const parts = path.split('.');
  let cursor = target;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) cursor[part] = value;
    else cursor = cursor[part] ||= {};
  });
}

/**
 * Read a value at a dotted object path.
 * @param {any} source Source object.
 * @param {string} path Dotted property path.
 * @returns {any} Value at the path.
 */
function readPath(source, path) {
  return path.split('.').reduce((value, part) => value?.[part], source);
}

/**
 * Serialize the inputs in a structured form.
 * @param {any[]} fields Field definitions.
 * @param {any} form Form container.
 * @returns {string} Serialized JSON value.
 */
function serializeForm(fields, form) {
  const result = {};
  form.querySelectorAll('input').forEach((element, index) => {
    assignPath(result, fields[index][0], fieldValue(element));
  });
  return JSON.stringify(result, null, 2);
}

/**
 * Parse the initial structured value.
 * @param {any} textInput Source input.
 * @param {DomHelpers} dom DOM helper facade.
 * @returns {Record<string, any>} Parsed object value.
 */
function parseInitialValue(textInput, dom) {
  try {
    const value = JSON.parse(dom.getValue(textInput) || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

/**
 * Create a structured input form.
 * @param {any[]} fields Field definitions.
 * @param {any} container Form container.
 * @param {any} textInput Backing text input.
 * @param {DomHelpers} dom DOM helper facade.
 * @returns {any} Created form element.
 */
function createForm(fields, container, textInput, dom) {
  const form = dom.createElement('div');
  dom.setClassName(form, FORM_SELECTOR.slice(1));
  const initial = parseInitialValue(textInput, dom);
  fields.forEach(([path, label, type]) => {
    const row = dom.createElement('label');
    const caption = dom.createElement('span');
    dom.setTextContent(caption, label);
    const input = /** @type {HTMLInputElement} */ (dom.createElement('input'));
    input.type = type;
    input.value =
      type === 'checkbox' ? '' : String(readPath(initial, path) ?? '');
    if (type === 'checkbox') input.checked = readPath(initial, path) === true;
    dom.appendChild(row, caption);
    dom.appendChild(row, input);
    dom.appendChild(form, row);
  });
  const update = () => {
    const value = serializeForm(fields, form);
    dom.setValue(textInput, value);
    setInputValue(textInput, value);
  };
  setupInputEvents(dom, form, update);
  dom.appendChild(container, form);
  update();
  form._dispose = createInputDisposer(dom, form, update);
  return form;
}

/**
 * Remove an existing structured form.
 * @param {DomHelpers} dom DOM helper facade.
 * @param {any} container Form container.
 * @returns {void}
 */
function removeExisting(dom, container) {
  const existing = dom.querySelector(container, FORM_SELECTOR);
  if (existing) {
    existing._dispose?.();
    dom.removeChild(container, existing);
  }
}

/**
 * Handle a structured input field.
 * @param {any[]} fields Field definitions.
 * @param {DomHelpers} dom DOM helper facade.
 * @param {any} container Form container.
 * @param {any} textInput Backing text input.
 * @returns {void}
 */
function structuredHandler(fields, dom, container, textInput) {
  hideAndDisable(textInput, dom);
  removeExisting(dom, container);
  createForm(fields, container, textInput, dom);
}

/**
 * Render the object-minute asset form.
 * @param {DomHelpers} dom DOM helper facade.
 * @param {HTMLElement} container Form container.
 * @param {HTMLInputElement} textInput Backing text input.
 * @returns {void}
 */
export function objectMinuteAssetHandler(dom, container, textInput) {
  structuredHandler(ASSET_FIELDS, dom, container, textInput);
}

/**
 * Render the possession-request form.
 * @param {DomHelpers} dom DOM helper facade.
 * @param {HTMLElement} container Form container.
 * @param {HTMLInputElement} textInput Backing text input.
 * @returns {void}
 */
export function possessionRequestHandler(dom, container, textInput) {
  structuredHandler(REQUEST_FIELDS, dom, container, textInput);
}
