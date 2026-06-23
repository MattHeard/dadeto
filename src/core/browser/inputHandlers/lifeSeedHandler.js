import * as browserCore from '../browser-core.js';
import { buildManagedForm, wireLabelledField } from './createDendriteHandler.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */

const FORM_CLASS = 'life-seed-form';

function createDefaultData() {
  return {
    width: 360,
    height: 240,
    cols: 24,
    rows: 16,
    tickSpeedMs: 128,
    cells: [
      [11, 7],
      [12, 7],
      [13, 7],
      [13, 6],
      [12, 5],
    ],
  };
}

function normalizePositiveInteger(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? Math.round(next) : fallback;
}

function parseCells(value, fallback) {
  const lines = String(value ?? '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  const parsed = lines
    .map(line => line.split(/[,\s]+/).slice(0, 2).map(Number))
    .filter(parts => parts.length === 2 && parts.every(Number.isInteger));
  return parsed.length > 0 ? parsed : fallback;
}

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
  if (data.reset === true) {
    normalized.reset = true;
  }
  return normalized;
}

function parseData(textInput, dom) {
  const raw = browserCore.getInputValue(textInput) || '{}';
  const parsed = browserCore.parseJsonOrDefault(raw, {});
  const normalized = normalizeData(parsed);
  return normalized;
}

function syncTextInput(textInput, data) {
  browserCore.setInputValue(textInput, JSON.stringify(data));
}

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

function createCellsField(dom, form, data, textInput, disposers) {
  const textarea = /** @type {HTMLTextAreaElement} */ (
    dom.createElement('textarea')
  );
  dom.setClassName(textarea, 'toy-textarea');
  dom.setPlaceholder(textarea, '11,7\n12,7\n13,7');
  dom.setValue(
    textarea,
    data.cells.map(cell => cell.join(',')).join('\n')
  );
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

function createResetField(dom, form, data, textInput, disposers) {
  const checkbox = /** @type {HTMLInputElement} */ (dom.createElement('input'));
  dom.setType(checkbox, 'checkbox');
  if (data.reset === true) {
    checkbox.checked = true;
  }

  wireLabelledField({
    dom,
    form,
    input: checkbox,
    labelText: 'Reset from seed',
    disposers,
    handler: () => {
      if (checkbox.checked) {
        data.reset = true;
      } else {
        delete data.reset;
      }
      syncTextInput(textInput, data);
    },
  });
}

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
  browserCore.hideAndDisable(textInput, dom);
  browserCore.applyBaseCleanupHandlers({
    container,
    dom,
    extraHandlers: [browserCore.maybeRemoveTextarea],
  });
  buildForm({ dom, container, textInput });
}
