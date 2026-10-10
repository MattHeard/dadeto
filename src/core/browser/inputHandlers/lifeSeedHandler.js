import * as browserCore from '../browser-core.js';
import { normalizePositiveInteger } from '../common.js';
import {
  buildManagedForm,
  wireLabelledField,
} from './createDendriteHandler.js';
import { prepareInputHandler } from './captureFormShared.js';
import { createDefaultLifeSeed } from '../toys/conwayLifeCore.js';
import { createNumberFieldInput } from './browserInputHandlersCore.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */
/** @typedef {{ width: number, height: number, cols: number, rows: number, tickSpeedMs: number, cells: number[][], reset?: boolean }} LifeSeedData */
/** @typedef {{ key: 'width' | 'height' | 'cols' | 'rows' | 'tickSpeedMs', label: string, placeholder: string, value: number }} NumberFieldOptions */
/** @typedef {(input: HTMLInputElement | HTMLTextAreaElement, handler: () => void, label: string) => void} WireLifeSeedField */
/** @typedef {(checked: boolean, handler: () => void) => HTMLInputElement} CreateLifeSeedCheckbox */

const FORM_CLASS = 'life-seed-form';

/**
 * Build the default life-seed payload.
 * @returns {LifeSeedData} Default data object.
 */
function createDefaultData() {
  return {
    width: 360,
    height: 240,
    cols: 24,
    rows: 16,
    tickSpeedMs: 128,
    reset: false,
    cells: createDefaultLifeSeed(),
  };
}

/**
 * Parse a newline-delimited list of x,y coordinate pairs.
 * @param {unknown} value Raw textarea contents.
 * @param {number[][]} fallback Existing coordinates.
 * @returns {number[][]} Parsed coordinates.
 */
function parseCells(value, fallback) {
  const parsed = [
    ...String(value).matchAll(/^\s*(-?\d+)[, \t]+(-?\d+)(?=$|[, \t])/gm),
  ].map(match => [Number(match[1]), Number(match[2])]);
  return parsed.length === 0 ? fallback : parsed;
}

/**
 * Normalize any user-provided payload into the expected life-seed shape.
 * @param {unknown} candidate Raw hidden-input payload.
 * @returns {LifeSeedData} Normalized form data.
 */
function normalizeData(candidate) {
  const data = /** @type {Record<string, unknown>} */ (Object(candidate));
  const normalized = createDefaultData();
  normalized.width = normalizePositiveInteger(data.width, normalized.width);
  normalized.height = normalizePositiveInteger(data.height, normalized.height);
  normalized.cols = normalizePositiveInteger(data.cols, normalized.cols);
  normalized.rows = normalizePositiveInteger(data.rows, normalized.rows);
  normalized.tickSpeedMs = normalizePositiveInteger(
    data.tickSpeedMs,
    normalized.tickSpeedMs
  );
  normalized.cells = parseCells(data.cells, normalized.cells);
  normalized.reset = data.reset === true;
  return normalized;
}

/**
 * Parse the hidden input into the managed life-seed data object.
 * @param {HTMLInputElement} textInput Hidden payload input.
 * @returns {LifeSeedData} Parsed payload.
 */
function parseData(textInput) {
  const raw = browserCore.getInputValue(textInput) || '{}';
  const parsed = browserCore.parseJsonOrDefault(raw, {});
  const normalized = normalizeData(parsed);
  return normalized;
}

/**
 * Mirror the managed payload back into the hidden input.
 * @param {HTMLInputElement} textInput Hidden payload input.
 * @param {LifeSeedData} data Managed form data.
 * @returns {void}
 */
function syncTextInput(textInput, data) {
  browserCore.setInputValue(textInput, JSON.stringify(data));
}

/**
 * Create the textarea for the live-cell coordinate list.
 * @param {DOMHelpers} dom DOM operations.
 * @param {LifeSeedData} data Managed form data.
 * @param {HTMLInputElement} textInput Hidden payload input.
 * @param {WireLifeSeedField} wireField Field wiring bound to the current form.
 * @returns {void}
 */
function createCellsField(dom, data, textInput, wireField) {
  const textarea = /** @type {HTMLTextAreaElement} */ (
    dom.createElement('textarea')
  );
  dom.setClassName(textarea, 'toy-textarea');
  dom.setPlaceholder(textarea, '11,7\n12,7\n13,7');
  dom.setValue(textarea, data.cells.map(cell => cell.join(',')).join('\n'));
  const updateCells = () => {
    data.cells = parseCells(dom.getValue(textarea), data.cells);
    syncTextInput(textInput, data);
  };
  wireField(textarea, updateCells, 'Live cells, one x,y per line');
}

/**
 * Create the reset checkbox bound to the managed payload.
 * @param {LifeSeedData} data Managed form data.
 * @param {HTMLInputElement} textInput Hidden payload input.
 * @param {CreateLifeSeedCheckbox} createCheckbox Checkbox creation bound to the current form.
 * @returns {void}
 */
function createResetField(data, textInput, createCheckbox) {
  /**
   * Mirror the checkbox state into the hidden payload.
   * @returns {void}
   */
  function updateReset() {
    if (checkbox.checked) {
      data.reset = true;
    } else {
      delete data.reset;
    }
    syncTextInput(textInput, data);
  }
  /** @type {HTMLInputElement} */
  const checkbox = createCheckbox(data.reset === true, updateReset);
}

/**
 * Build the life-seed configuration form.
 * @param {{ dom: DOMHelpers, container: HTMLElement, textInput: HTMLInputElement }} root0 Form setup dependencies.
 * @returns {HTMLElement} Rendered form.
 */
function buildForm({ dom, container, textInput }) {
  const data = parseData(textInput);
  return buildManagedForm(
    { dom, container, textInput },
    ({ form, disposers }) => {
      dom.setClassName(form, FORM_CLASS);
      /** @type {WireLifeSeedField} */
      const wireField = (input, handler, labelText) => {
        wireLabelledField(dom, form, input, handler)(labelText, disposers);
      };
      /** @type {CreateLifeSeedCheckbox} */
      const createResetCheckbox = (checked, handler) => {
        const checkbox = /** @type {HTMLInputElement} */ (
          dom.createElement('input')
        );
        dom.setType(checkbox, 'checkbox');
        if (checked) {
          checkbox.checked = true;
        }
        wireField(checkbox, handler, 'Reset from seed');
        return checkbox;
      };
      /** @type {NumberFieldOptions[]} */
      const numberFieldOptions = [
        {
          key: 'width',
          label: 'Canvas width',
          placeholder: '360',
          value: data.width,
        },
        {
          key: 'height',
          label: 'Canvas height',
          placeholder: '240',
          value: data.height,
        },
        {
          key: 'cols',
          label: 'Columns',
          placeholder: '24',
          value: data.cols,
        },
        {
          key: 'rows',
          label: 'Rows',
          placeholder: '16',
          value: data.rows,
        },
        {
          key: 'tickSpeedMs',
          label: 'Tick speed (ms)',
          placeholder: '128',
          value: data.tickSpeedMs,
        },
      ];

      for (let index = 0; index < numberFieldOptions.length; index += 1) {
        const { key, label, placeholder, value } = numberFieldOptions[index];
        const input = createNumberFieldInput(dom, { value, placeholder });
        const updateNumber = () => {
          data[key] = normalizePositiveInteger(dom.getValue(input), value);
          browserCore.setInputValue(textInput, JSON.stringify(data));
        };
        wireField(input, updateNumber, label);
      }
      createCellsField(dom, data, textInput, wireField);
      createResetField(data, textInput, createResetCheckbox);
      return { data, form };
    }
  );
}

/**
 * Switch the UI to a Conway Life form.
 * @param {DOMHelpers} dom - DOM helper utilities.
 * @param {HTMLElement} container - Container element housing the input.
 * @param {HTMLInputElement} textInput - Hidden text input.
 * @returns {void}
 */
export function lifeSeedHandler(dom, container, textInput) {
  prepareInputHandler(dom, container, textInput, [
    browserCore.maybeRemoveTextarea,
  ]);
  const options = { dom, container, textInput };
  buildForm(options);
}

export { createDefaultData, parseCells, normalizeData, parseData };
