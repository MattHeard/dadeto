import {
  createDefaultHandler,
  getInputValue,
  hideAndDisable,
  maybeRemoveDendrite,
  maybeRemoveKV,
  maybeRemoveModeratorRatings,
  maybeRemoveNumber,
  maybeRemoveTextarea,
  parseJsonOrDefault,
  setInputValue,
} from '../browser-core.js';
import { insertBeforeNextSibling } from './browserInputHandlersCore.js';
import { MODERATOR_RATINGS_FORM_SELECTOR } from '../../constants/selectors.js';

const FORM_CLASS = MODERATOR_RATINGS_FORM_SELECTOR.slice(1);
const ROW_CLASS = 'moderator-rating-row';
const ROWS_CONTAINER_CLASS = 'moderator-rating-rows';
const ADD_BUTTON_CLASS = 'moderator-rating-add';
const ADD_BUTTON_LABEL = 'Add rating';
const REMOVE_BUTTON_LABEL = 'Remove rating';
const APPROVED_OPTION_LABEL = 'Approved';
const REJECTED_OPTION_LABEL = 'Rejected';

const cleanupModeratorRatings = createDefaultHandler([
  maybeRemoveNumber,
  maybeRemoveKV,
  maybeRemoveTextarea,
  maybeRemoveDendrite,
  maybeRemoveModeratorRatings,
]);

const toNormalizedString = value => {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim();
};

const toBoolean = value => value === true || value === 'true';

/**
 * Normalize a rating entry into the schema that the toy expects.
 * @param {unknown} entry Value parsed from the hidden input.
 * @returns {{moderatorId: string, variantId: string, ratedAt: string, isApproved: boolean}}
 */
export function normalizeRatingEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return {
      moderatorId: '',
      variantId: '',
      ratedAt: '',
      isApproved: false,
    };
  }

  return {
    moderatorId: toNormalizedString(entry.moderatorId),
    variantId: toNormalizedString(entry.variantId),
    ratedAt: toNormalizedString(entry.ratedAt),
    isApproved: toBoolean(entry.isApproved),
  };
}

/**
 * Serialize the current row models into a clean JSON array payload.
 * @param {Array<Record<string, unknown>>} rows Row models managed by the form.
 * @returns {Array<ReturnType<typeof normalizeRatingEntry>>} Normalized payload.
 */
export function serializeRatingRows(rows) {
  return rows.map(normalizeRatingEntry);
}

const createEmptyRating = () => normalizeRatingEntry(null);

const buildFieldInput = (dom, placeholder, value, onChange, cleanupFns) => {
  const input = dom.createElement('input');
  dom.setType(input, 'text');
  dom.setPlaceholder(input, placeholder);
  dom.setValue(input, value);

  const handleInput = () => {
    onChange(dom.getValue(input));
  };

  dom.addEventListener(input, 'input', handleInput);
  cleanupFns.push(() => dom.removeEventListener(input, 'input', handleInput));
  return input;
};

const buildApproveToggle = (dom, initialValue, onChange, cleanupFns) => {
  const select = dom.createElement('select');
  const options = [
    ['true', APPROVED_OPTION_LABEL],
    ['false', REJECTED_OPTION_LABEL],
  ];
  options.forEach(([value, label]) => {
    const option = dom.createElement('option');
    dom.setValue(option, value);
    dom.setTextContent(option, label);
    dom.appendChild(select, option);
  });

  dom.setValue(select, initialValue ? 'true' : 'false');

  const handleChange = () => {
    onChange(dom.getValue(select) === 'true');
  };

  dom.addEventListener(select, 'change', handleChange);
  cleanupFns.push(() =>
    dom.removeEventListener(select, 'change', handleChange)
  );
  return select;
};

const buildRemoveButton = (dom, onClick, cleanupFns) => {
  const button = dom.createElement('button');
  dom.setType(button, 'button');
  dom.setTextContent(button, REMOVE_BUTTON_LABEL);
  dom.addEventListener(button, 'click', onClick);
  cleanupFns.push(() => dom.removeEventListener(button, 'click', onClick));
  return button;
};

const syncTextInput = (rows, dom, textInput) => {
  const serialised = JSON.stringify(serializeRatingRows(rows));
  dom.setValue(textInput, serialised);
  setInputValue(textInput, serialised);
};

const ensureModeratorRatingsForm = (dom, container, textInput) => {
  const form = dom.createElement('div');
  dom.setClassName(form, FORM_CLASS);
  const rowsContainer = dom.createElement('div');
  dom.setClassName(rowsContainer, ROWS_CONTAINER_CLASS);
  dom.appendChild(form, rowsContainer);

  const addButton = dom.createElement('button');
  dom.setType(addButton, 'button');
  dom.setClassName(addButton, ADD_BUTTON_CLASS);
  dom.setTextContent(addButton, ADD_BUTTON_LABEL);
  dom.appendChild(form, addButton);

  insertBeforeNextSibling({ container, textInput, element: form, dom });
  dom.reveal(form);

  const rows = (() => {
    const parsed = parseJsonOrDefault(getInputValue(textInput), []);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(normalizeRatingEntry);
  })();

  if (!rows.length) {
    rows.push(createEmptyRating());
  }

  const rowCleanups = new Set();

  const registerRowCleanup = cleanup => {
    rowCleanups.add(cleanup);
    return () => rowCleanups.delete(cleanup);
  };

  const appendRow = rowModel => {
    const cleanupFns = [];
    const rowElement = dom.createElement('div');
    dom.setClassName(rowElement, ROW_CLASS);

    const authorInput = buildFieldInput(
      dom,
      'Moderator ID',
      rowModel.moderatorId,
      value => {
        rowModel.moderatorId = value;
        syncTextInput(rows, dom, textInput);
      },
      cleanupFns
    );

    const variantInput = buildFieldInput(
      dom,
      'Variant ID',
      rowModel.variantId,
      value => {
        rowModel.variantId = value;
        syncTextInput(rows, dom, textInput);
      },
      cleanupFns
    );

    const ratedAtInput = buildFieldInput(
      dom,
      'ratedAt (ISO 8601)',
      rowModel.ratedAt,
      value => {
        rowModel.ratedAt = value;
        syncTextInput(rows, dom, textInput);
      },
      cleanupFns
    );

    const approveSelect = buildApproveToggle(
      dom,
      rowModel.isApproved,
      value => {
        rowModel.isApproved = value;
        syncTextInput(rows, dom, textInput);
      },
      cleanupFns
    );

    const cleanupRow = () => cleanupFns.forEach(fn => fn());
    const unregisterCleanup = registerRowCleanup(cleanupRow);

    const removeRow = () => {
      cleanupRow();
      unregisterCleanup();
      const index = rows.indexOf(rowModel);
      if (index >= 0) {
        rows.splice(index, 1);
      }
      dom.removeChild(rowsContainer, rowElement);
      syncTextInput(rows, dom, textInput);
    };

    const removeButton = buildRemoveButton(dom, removeRow, cleanupFns);
    [
      authorInput,
      variantInput,
      ratedAtInput,
      approveSelect,
      removeButton,
    ].forEach(el => dom.appendChild(rowElement, el));

    dom.appendChild(rowsContainer, rowElement);
  };

  rows.forEach(appendRow);
  syncTextInput(rows, dom, textInput);

  const addRow = () => {
    const newRow = createEmptyRating();
    rows.push(newRow);
    appendRow(newRow);
    syncTextInput(rows, dom, textInput);
  };

  const cleanupFns = [];
  const handleAddRow = () => addRow();
  dom.addEventListener(addButton, 'click', handleAddRow);
  cleanupFns.push(() =>
    dom.removeEventListener(addButton, 'click', handleAddRow)
  );

  form._dispose = () => {
    rowCleanups.forEach(cleanup => cleanup());
    rowCleanups.clear();
    cleanupFns.forEach(fn => fn());
  };

  return form;
};

/**
 * Switch the UI to use the moderator rating builder form.
 * @param {object} dom DOM helpers.
 * @param {HTMLElement} container Container that wraps the input.
 * @param {HTMLInputElement} textInput Hidden input element storing the JSON payload.
 */
export function moderatorRatingsHandler(dom, container, textInput) {
  cleanupModeratorRatings(dom, container, textInput);
  ensureModeratorRatingsForm(dom, container, textInput);
}
