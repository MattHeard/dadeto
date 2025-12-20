import * as browserCore from '../browser-core.js';
import { insertBeforeNextSibling } from './browserInputHandlersCore.js';
import { isNonNullObject } from '../../commonCore.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */
/** @typedef {{ moderatorId: string, variantId: string, ratedAt: string, isApproved: boolean }} RatingEntry */
/** @typedef {RatingEntry & Record<string, unknown>} RatingRow */
/** @typedef {() => void} CleanupFn */

const { MODERATOR_RATINGS_FORM_SELECTOR } = browserCore;

const FORM_CLASS = MODERATOR_RATINGS_FORM_SELECTOR.slice(1);
const ROW_CLASS = 'moderator-rating-row';
const ROWS_CONTAINER_CLASS = 'moderator-rating-rows';
const ADD_BUTTON_CLASS = 'moderator-rating-add';
const ADD_BUTTON_LABEL = 'Add rating';
const REMOVE_BUTTON_LABEL = 'Remove rating';
const APPROVED_OPTION_LABEL = 'Approved';
const REJECTED_OPTION_LABEL = 'Rejected';

const cleanupModeratorRatings = browserCore.createDefaultHandler([
  browserCore.maybeRemoveNumber,
  browserCore.maybeRemoveKV,
  browserCore.maybeRemoveTextarea,
  browserCore.maybeRemoveDendrite,
  browserCore.maybeRemoveModeratorRatings,
]);

/**
 * Normalize unknown values into a trimmed string.
 * @param {unknown} value - Raw input.
 * @returns {string} Normalized string.
 */
const toNormalizedString = value => String(value ?? '').trim();

/**
 * Normalize unknown values into a boolean.
 * @param {unknown} value - Raw input.
 * @returns {boolean} Normalized boolean.
 */
const toBoolean = value => value === true || value === 'true';

/**
 * Normalize a rating entry into the schema that the toy expects.
 * @param {unknown} entry Value parsed from the hidden input.
 * @returns {{moderatorId: string, variantId: string, ratedAt: string, isApproved: boolean}} Normalized entry.
 */
const defaultRatingEntry = {
  moderatorId: '',
  variantId: '',
  ratedAt: '',
  isApproved: false,
};

const createDefaultRatingEntry = () => ({ ...defaultRatingEntry });

/**
 * Normalize a rating entry into the schema that the toy expects.
 * @param {unknown} entry Value parsed from the hidden input.
 * @returns {{moderatorId: string, variantId: string, ratedAt: string, isApproved: boolean}} Normalized entry.
 */
export function normalizeRatingEntry(entry) {
  if (!isNonNullObject(entry)) {
    return createDefaultRatingEntry();
  }

  const candidate = /** @type {Record<string, unknown>} */ (entry);
  return {
    moderatorId: toNormalizedString(candidate.moderatorId),
    variantId: toNormalizedString(candidate.variantId),
    ratedAt: toNormalizedString(candidate.ratedAt),
    isApproved: toBoolean(candidate.isApproved),
  };
}

/**
 * Serialize the current row models into a clean JSON array payload.
 * @param {RatingRow[]} rows Row models managed by the form.
 * @returns {Array<ReturnType<typeof normalizeRatingEntry>>} Normalized payload.
 */
export function serializeRatingRows(rows) {
  return rows.map(normalizeRatingEntry);
}

const createEmptyRating = createDefaultRatingEntry;

/**
 * Build a text input with shared wiring.
 * @param {{ dom: DOMHelpers, placeholder: string, value: string, onChange: (value: string) => void, cleanupFns: CleanupFn[] }} options - Input configuration.
 * @returns {HTMLInputElement} Initialized input element.
 */
const buildFieldInput = ({ dom, placeholder, value, onChange, cleanupFns }) => {
  const input = /** @type {HTMLInputElement} */ (dom.createElement('input'));
  dom.setType(input, 'text');
  dom.setPlaceholder(input, placeholder);
  dom.setValue(input, value);

  const handleInput = () => {
    onChange(String(dom.getValue(input)));
  };

  dom.addEventListener(input, 'input', handleInput);
  cleanupFns.push(() => dom.removeEventListener(input, 'input', handleInput));
  return input;
};

/**
 * Build the approved/rejected toggle control.
 * @param {{ dom: DOMHelpers, initialValue: boolean, onChange: (value: boolean) => void, cleanupFns: CleanupFn[] }} options - Toggle configuration.
 * @returns {HTMLSelectElement} Initialized select element.
 */
const buildApproveToggle = ({ dom, initialValue, onChange, cleanupFns }) => {
  const select = /** @type {HTMLSelectElement} */ (dom.createElement('select'));
  const options = [
    ['true', APPROVED_OPTION_LABEL],
    ['false', REJECTED_OPTION_LABEL],
  ];
  options.forEach(([value, label]) => {
    const option = /** @type {HTMLOptionElement} */ (
      dom.createElement('option')
    );
    dom.setValue(option, value);
    dom.setTextContent(option, label);
    dom.appendChild(select, option);
  });

  const initialIndex = Number(!initialValue);
  dom.setValue(select, options[initialIndex][0]);

  const handleChange = () => {
    onChange(String(dom.getValue(select)) === 'true');
  };

  dom.addEventListener(select, 'change', handleChange);
  cleanupFns.push(() =>
    dom.removeEventListener(select, 'change', handleChange)
  );
  return select;
};

/**
 * Build the remove row button.
 * @param {{ dom: DOMHelpers, onClick: () => void, cleanupFns: CleanupFn[] }} options - Button configuration.
 * @returns {HTMLButtonElement} Initialized button element.
 */
const buildRemoveButton = ({ dom, onClick, cleanupFns }) => {
  const button = /** @type {HTMLButtonElement} */ (dom.createElement('button'));
  dom.setType(button, 'button');
  dom.setTextContent(button, REMOVE_BUTTON_LABEL);
  dom.addEventListener(button, 'click', onClick);
  cleanupFns.push(() => dom.removeEventListener(button, 'click', onClick));
  return button;
};

/**
 * Sync serialized rows into the hidden input and store.
 * @param {RatingRow[]} rows - Current row models.
 * @param {DOMHelpers} dom - DOM utilities.
 * @param {HTMLInputElement} textInput - Hidden JSON input.
 * @returns {void}
 */
const syncTextInput = (rows, dom, textInput) => {
  const serialised = JSON.stringify(serializeRatingRows(rows));
  dom.setValue(textInput, serialised);
  browserCore.setInputValue(textInput, serialised);
};

/**
 * Build a change handler for a row model property that keeps the hidden input in sync.
 * @param {{rows: RatingRow[], dom: DOMHelpers, textInput: HTMLInputElement, rowModel: RatingRow}} options - Handler dependencies.
 * @returns {(key: string) => (value: unknown) => void} Factory that builds change handlers per property.
 */
const createRowChangeHandler =
  ({ rows, dom, textInput, rowModel }) =>
  key =>
  value => {
    rowModel[key] = value;
    syncTextInput(rows, dom, textInput);
  };

/**
 * Ensure the form and rows are mounted in the container.
 * @param {DOMHelpers} dom - DOM utilities.
 * @param {HTMLElement} container - Container element.
 * @param {HTMLInputElement} textInput - Hidden JSON input.
 * @returns {HTMLElement} Form element.
 */
const ensureModeratorRatingsForm = (dom, container, textInput) => {
  const form = /** @type {HTMLElement & { _dispose?: CleanupFn }} */ (
    dom.createElement('div')
  );
  dom.setClassName(form, FORM_CLASS);
  const rowsContainer = /** @type {HTMLDivElement} */ (
    dom.createElement('div')
  );
  dom.setClassName(rowsContainer, ROWS_CONTAINER_CLASS);
  dom.appendChild(form, rowsContainer);

  const addButton = /** @type {HTMLButtonElement} */ (
    dom.createElement('button')
  );
  dom.setType(addButton, 'button');
  dom.setClassName(addButton, ADD_BUTTON_CLASS);
  dom.setTextContent(addButton, ADD_BUTTON_LABEL);
  dom.appendChild(form, addButton);

  insertBeforeNextSibling({ container, textInput, element: form, dom });
  dom.reveal(form);

  const rows = (() => {
    const parsed = browserCore.parseJsonOrDefault(
      browserCore.getInputValue(textInput),
      []
    );
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(normalizeRatingEntry);
  })();

  if (!rows.length) {
    rows.push(createEmptyRating());
  }

  /** @type {Set<CleanupFn>} */
  const rowCleanups = new Set();

  /**
   * Register a cleanup handler for a row.
   * @param {CleanupFn} cleanup - Cleanup handler to track.
   * @returns {CleanupFn} Function that unregisters the handler.
   */
  const registerRowCleanup = cleanup => {
    rowCleanups.add(cleanup);
    return () => rowCleanups.delete(cleanup);
  };

  /**
   * Append a row to the form and register its cleanup.
   * @param {RatingRow} rowModel - Row model for the rendered inputs.
   * @returns {void}
   */
  const appendRow = rowModel => {
    /** @type {CleanupFn[]} */
    const cleanupFns = [];
    const rowElement = /** @type {HTMLDivElement} */ (dom.createElement('div'));
    dom.setClassName(rowElement, ROW_CLASS);

    const handleRowChange = createRowChangeHandler({
      rows,
      dom,
      textInput,
      rowModel,
    });

    const authorInput = buildFieldInput({
      dom,
      placeholder: 'Moderator ID',
      value: rowModel.moderatorId,
      onChange: handleRowChange('moderatorId'),
      cleanupFns,
    });

    const variantInput = buildFieldInput({
      dom,
      placeholder: 'Variant ID',
      value: rowModel.variantId,
      onChange: handleRowChange('variantId'),
      cleanupFns,
    });

    const ratedAtInput = buildFieldInput({
      dom,
      placeholder: 'ratedAt (ISO 8601)',
      value: rowModel.ratedAt,
      onChange: handleRowChange('ratedAt'),
      cleanupFns,
    });

    const approveSelect = buildApproveToggle({
      dom,
      initialValue: rowModel.isApproved,
      onChange: handleRowChange('isApproved'),
      cleanupFns,
    });

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

    const removeButton = buildRemoveButton({
      dom,
      onClick: removeRow,
      cleanupFns,
    });
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

  /** @type {CleanupFn[]} */
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
 * @param {DOMHelpers} dom DOM helpers.
 * @param {HTMLElement} container Container that wraps the input.
 * @param {HTMLInputElement} textInput Hidden input element storing the JSON payload.
 */
export function moderatorRatingsHandler(dom, container, textInput) {
  cleanupModeratorRatings(dom, container, textInput);
  ensureModeratorRatingsForm(dom, container, textInput);
}
