import * as browserCore from '../browser-core.js';
import { normalizePositiveInteger } from '../common.js';
import { buildManagedForm, wireLabelledField } from './createDendriteHandler.js';
import { prepareInputHandler } from './captureFormShared.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */
/** @typedef {{ width: number, height: number, cols: number, rows: number, tickSpeedMs: number, cells: number[][], reset?: boolean }} LifeSeedData */
/** @typedef {{ key: 'width' | 'height' | 'cols' | 'rows' | 'tickSpeedMs', label: string, placeholder: string, value: number }} NumberFieldOptions */

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
    cells: [
      [11, 7],
      [12, 7],
      [13, 7],
      [13, 6],
      [12, 5],
    ],
  };
}

/**
 * Parse a newline-delimited list of x,y coordinate pairs.
 * @param {unknown} value Raw textarea contents.
 * @param {number[][]} fallback Existing coordinates.
 * @returns {number[][]} Parsed coordinates.
 */
function parseCells(value, fallback) {
  const lines = String(value ?? '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  const parsed = lines
    .map(line =>
      line
        .split(/[,\s]+/)
        .slice(0, 2)
        .map(Number)
    )
    .filter(parts => parts.length === 2 && parts.every(Number.isInteger));
  return parsed.length > 0 ? parsed : fallback;
}

/**
 * Normalize any user-provided payload into the expected life-seed shape.
 * @param {unknown} candidate Raw hidden-input payload.
 * @returns {LifeSeedData} Normalized form data.
 */
function normalizeData(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return createDefaultData();
  }

  const data = /** @type {Record<string, unknown>} */ (candidate);
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
 * @param {DOMHelpers} dom DOM helper utilities.
 * @returns {LifeSeedData} Parsed payload.
 */
function parseData(textInput, dom) {
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
 * Create a number input bound to a life-seed field.
 * @param {DOMHelpers} dom DOM helper utilities.
 * @param {HTMLElement} form Managed form element.
 * @param {LifeSeedData} data Shared payload object.
 * @param {HTMLInputElement} textInput Hidden payload input.
 * @param {Array<() => void>} disposers Cleanup callbacks.
 * @param {NumberFieldOptions} options Field metadata.
 * @returns {void}
 */
function createNumberField(dom, form, data, textInput, disposers, options) {
  const input = /** @type {HTMLInputElement} */ (dom.createElement('input'));
  dom.setType(input, 'number');
  dom.setValue(input, options.value);
  dom.setPlaceholder(input, options.placeholder);
  wireLabelledField({
    dom,
    form,
    input,
    labelText: options.label,
    disposers,
    handler: () => {
      data[options.key] = normalizePositiveInteger(
        dom.getValue(input),
        options.value
      );
      browserCore.setInputValue(textInput, JSON.stringify(data));
    },
  });
}

/**
 * Create the textarea for the live-cell coordinate list.
 * @param {DOMHelpers} dom DOM helper utilities.
 * @param {HTMLElement} form Managed form element.
 * @param {LifeSeedData} data Shared payload object.
 * @param {HTMLInputElement} textInput Hidden payload input.
 * @param {Array<() => void>} disposers Cleanup callbacks.
 * @returns {void}
 */
function createCellsField(dom, form, data, textInput, disposers) {
  const textarea = /** @type {HTMLTextAreaElement} */ (
    dom.createElement('textarea')
  );
  dom.setClassName(textarea, 'toy-textarea');
  dom.setPlaceholder(textarea, '11,7\n12,7\n13,7');
  dom.setValue(textarea, data.cells.map(cell => cell.join(',')).join('\n'));
  wireLabelledField({
    dom,
    form,
    input: textarea,
    labelText: 'Live cells, one x,y per line',
    disposers,
    handler: () => {
      data.cells = parseCells(dom.getValue(textarea), data.cells);
      syncTextInput(textInput, data);
    },
  });
}

/**
 * Create a labelled checkbox field and wire its change handler.
 * @param {DOMHelpers} dom DOM helper utilities.
 * @param {HTMLElement} form Managed form element.
 * @param {string} labelText Label text shown next to the checkbox.
 * @param {boolean} checked Whether the checkbox starts checked.
 * @param {() => void} handler Change handler.
 * @param {Array<() => void>} disposers Cleanup callbacks.
 * @returns {HTMLInputElement} Created checkbox element.
 */
function createCheckboxField(dom, form, labelText, checked, handler, disposers) {
  const checkbox = /** @type {HTMLInputElement} */ (dom.createElement('input'));
  dom.setType(checkbox, 'checkbox');
  if (checked) {
    checkbox.checked = true;
  }

  wireLabelledField({
    dom,
    form,
    input: checkbox,
    labelText,
    disposers,
    handler,
  });
  return checkbox;
}

/**
 * Create the reset checkbox bound to the managed payload.
 * @param {DOMHelpers} dom DOM helper utilities.
 * @param {HTMLElement} form Managed form element.
 * @param {LifeSeedData} data Shared payload object.
 * @param {HTMLInputElement} textInput Hidden payload input.
 * @param {Array<() => void>} disposers Cleanup callbacks.
 * @returns {void}
 */
function createResetField(dom, form, data, textInput, disposers) {
  const checkbox = createCheckboxField(
    dom,
    form,
    'Reset from seed',
    data.reset === true,
    () => {
      if (checkbox.checked) {
        data.reset = true;
      } else {
        delete data.reset;
      }
      syncTextInput(textInput, data);
    },
    disposers
  );
  return checkbox;
}

/**
 * Build the life-seed configuration form.
 * @param {{ dom: DOMHelpers, container: HTMLElement, textInput: HTMLInputElement }} root0 Form setup dependencies.
 * @returns {HTMLElement} Rendered form.
 */
function buildForm({ dom, container, textInput }) {
  const data = parseData(textInput, dom);
  return buildManagedForm(
    { dom, container, textInput },
    ({ form, disposers }) => {
      dom.setClassName(form, FORM_CLASS);
      createNumberField(dom, form, data, textInput, disposers, {
        key: 'width',
        label: 'Canvas width',
        placeholder: '360',
        value: data.width,
      });
      createNumberField(dom, form, data, textInput, disposers, {
        key: 'height',
        label: 'Canvas height',
        placeholder: '240',
        value: data.height,
      });
      createNumberField(dom, form, data, textInput, disposers, {
        key: 'cols',
        label: 'Columns',
        placeholder: '24',
        value: data.cols,
      });
      createNumberField(dom, form, data, textInput, disposers, {
        key: 'rows',
        label: 'Rows',
        placeholder: '16',
        value: data.rows,
      });
      createNumberField(dom, form, data, textInput, disposers, {
        key: 'tickSpeedMs',
        label: 'Tick speed (ms)',
        placeholder: '128',
        value: data.tickSpeedMs,
      });
      createCellsField(dom, form, data, textInput, disposers);
      createResetField(dom, form, data, textInput, disposers);
      syncTextInput(textInput, data);
      return form;
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
  prepareInputHandler({
    dom,
    container,
    textInput,
    extraHandlers: [browserCore.maybeRemoveTextarea],
  });
  buildForm({ dom, container, textInput });
}
