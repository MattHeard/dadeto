import {
  createParsedJsonPresenter,
  createSectionWithRows,
  createPresenterRoot,
} from './browserPresentersCore.js';
import {
  objectOrEmpty,
  normalizeNonStringValue,
  whenOrNull,
} from '../../commonCore.js';
import { isNullishOrEmptyString } from '../browser-core.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */

const ROOT_CLASS = 'real-hourly-wage-output';
const HEADER_CLASS = 'real-hourly-wage-header';
const TITLE_CLASS = 'real-hourly-wage-title';
const INTRO_CLASS = 'real-hourly-wage-intro';
const SECTION_CLASS = 'real-hourly-wage-section';
const TABLE_CLASS = 'real-hourly-wage-table';
const ROW_CLASS = 'real-hourly-wage-row';
const LABEL_CLASS = 'real-hourly-wage-label';
const VALUE_CLASS = 'real-hourly-wage-value';
const TITLE_TEXT = 'Real Hourly Wage';
const INTRO_TEXT = 'Calculated from one normalized period of work.';

/**
 * Create a text element with optional class assignment.
 * @param {DOMHelpers} dom DOM helper facade.
 * @param {{ tag: string, className: string, text: string }} options Element properties.
 * @returns {HTMLElement} Created element.
 */
function createTextElement(dom, options) {
  const element = dom.createElement(options.tag);
  dom.setClassName(element, options.className);
  dom.setTextContent(element, options.text);
  return element;
}

/**
 * Create a table body row.
 * @param {DOMHelpers} dom DOM helper facade.
 * @param {string} label Row label.
 * @param {unknown} value Row value.
 * @returns {HTMLElement} Table row.
 */
function createRow(dom, label, value) {
  const row = dom.createElement('tr');
  dom.setClassName(row, ROW_CLASS);

  const labelCell = createTextElement(dom, {
    tag: 'th',
    className: LABEL_CLASS,
    text: label,
  });
  const valueCell = createTextElement(dom, {
    tag: 'td',
    className: VALUE_CLASS,
    text: formatDisplayValue(value),
  });

  dom.appendChild(row, labelCell);
  dom.appendChild(row, valueCell);
  return row;
}

/**
 * Create a table for key/value rows.
 * @param {DOMHelpers} dom DOM helper facade.
 * @param {Array<[string, unknown]>} rows Rows to render.
 * @returns {HTMLElement} Table element.
 */
function createTable(dom, rows) {
  const table = dom.createElement('table');
  dom.setClassName(table, TABLE_CLASS);

  if (!rows.length) {
    const emptyRow = createRow(dom, 'None', '—');
    dom.appendChild(table, emptyRow);
    return table;
  }

  rows.forEach(([label, value]) => {
    dom.appendChild(table, createRow(dom, label, value));
  });
  return table;
}

/**
 * Normalize a display value for the report.
 * @param {unknown} value Raw value.
 * @returns {string} Display string.
 */
function formatDisplayValue(value) {
  const emptyDisplayValue = formatEmptyDisplayValue(value);
  if (emptyDisplayValue !== null) {
    return emptyDisplayValue;
  }

  return formatDisplayValueBody(value);
}

/**
 * Format the non-empty part of a display value.
 * @param {unknown} value Raw value.
 * @returns {string} Display text.
 */
function formatDisplayValueBody(value) {
  const numericDisplayValue = formatNumericDisplayValue(value);
  if (numericDisplayValue !== null) {
    return numericDisplayValue;
  }

  return normalizeNonStringValue(value);
}

/**
 * Format a numeric value for display.
 * @param {number} value Numeric value.
 * @returns {string} Formatted number.
 */
function formatNumber(value) {
  const invalidNumber = formatInvalidNumber(value);
  if (invalidNumber !== null) {
    return invalidNumber;
  }

  return formatNumberBody(value);
}

/**
 * Format the numeric part of a display value.
 * @param {number} value Numeric value.
 * @returns {string} Display text.
 */
function formatNumberBody(value) {
  const wholeNumber = formatWholeNumber(value);
  if (wholeNumber !== null) {
    return wholeNumber;
  }

  return value.toFixed(2);
}

/**
 * Format a missing display value.
 * @param {unknown} value Raw value.
 * @returns {string | null} Missing-value marker or null.
 */
function formatEmptyDisplayValue(value) {
  return returnDashIf(isNullishOrEmptyString(value));
}

/**
 * Format a numeric display value.
 * @param {unknown} value Raw value.
 * @returns {string | null} Numeric display string or null.
 */
function formatNumericDisplayValue(value) {
  return whenOrNull(typeof value === 'number', () => formatNumber(value));
}

/**
 * Format a non-finite numeric value.
 * @param {number} value Numeric value.
 * @returns {string | null} Missing marker or null.
 */
function formatInvalidNumber(value) {
  return returnDashIf(!Number.isFinite(value));
}

/**
 * Format a whole number.
 * @param {number} value Numeric value.
 * @returns {string | null} Whole-number string or null.
 */
function formatWholeNumber(value) {
  return whenOrNull(Number.isInteger(value), () => String(value));
}

/**
 * Convert a camelCase key into a human-readable label.
 * @param {string} key Source key.
 * @returns {string} Human readable label.
 */
function humanizeKey(key) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, first => first.toUpperCase());
}

/**
 * Collect the summary rows for the wage report.
 * @param {Record<string, unknown>} parsed Parsed payload.
 * @returns {Array<[string, unknown]>} Summary rows.
 */
function getSummaryRows(parsed) {
  return [
    ['Nominal hourly wage', parsed.nominalHourlyWage],
    ['Real hourly wage', parsed.realHourlyWage],
    ['Adjusted net income', parsed.adjustedNetIncome],
    ['Total work-related hours', parsed.totalWorkRelatedHours],
    ['Total work-related expenses', parsed.totalWorkRelatedExpenses],
  ];
}

/**
 * Normalize an arbitrary candidate to a record.
 * @param {unknown} candidate Candidate value.
 * @returns {Record<string, unknown>} Record or empty object.
 */
function getRecordOrEmpty(candidate) {
  return objectOrEmpty(candidate);
}

/**
 * Read the breakdown object from a parsed wage payload.
 * @param {Record<string, unknown>} parsed Parsed payload.
 * @returns {Record<string, unknown>} Breakdown object.
 */
function getBreakdown(parsed) {
  return getRecordOrEmpty(parsed.breakdown);
}

/**
 * Read a nested record from an object.
 * @param {Record<string, unknown>} source Source record.
 * @param {string} key Record key.
 * @returns {Record<string, unknown>} Nested record or empty object.
 */
function getNestedRecord(source, key) {
  return getRecordOrEmpty(source[key]);
}

/**
 * Collect the hour breakdown rows.
 * @param {Record<string, unknown>} parsed Parsed payload.
 * @returns {Array<[string, unknown]>} Hour rows.
 */
function getHourRows(parsed) {
  const breakdown = getBreakdown(parsed);
  const directHoursByType = getNestedRecord(breakdown, 'directHoursByType');
  return [
    ['Paid work hours', breakdown.paidWorkHours],
    ['Overhead hours', breakdown.overheadHours],
    ['Total hours', breakdown.totalHours],
    ...Object.entries(directHoursByType).map(([key, value]) => [
      humanizeKey(key),
      value,
    ]),
  ];
}

/**
 * Collect the expense breakdown rows.
 * @param {Record<string, unknown>} parsed Parsed payload.
 * @returns {Array<[string, unknown]>} Expense rows.
 */
function getExpenseRows(parsed) {
  const breakdown = getBreakdown(parsed);
  const expensesByType = getNestedRecord(breakdown, 'expensesByType');
  return Object.entries(expensesByType).map(([key, value]) => [
    humanizeKey(key),
    value,
  ]);
}

/**
 * Build the summary section for the report.
 * @param {Record<string, unknown>} parsed Parsed payload.
 * @param {DOMHelpers} dom DOM helper facade.
 * @returns {HTMLElement} Summary section.
 */
function createSummarySection(parsed, dom) {
  return createWageSection({
    parsed,
    dom,
    title: 'Summary',
    getRows: getSummaryRows,
  });
}

/**
 * Build the hour breakdown section for the report.
 * @param {Record<string, unknown>} parsed Parsed payload.
 * @param {DOMHelpers} dom DOM helper facade.
 * @returns {HTMLElement} Hour breakdown section.
 */
function createHourSection(parsed, dom) {
  return createWageSection({
    parsed,
    dom,
    title: 'Hours breakdown',
    getRows: getHourRows,
  });
}

/**
 * Build the expense breakdown section for the report.
 * @param {Record<string, unknown>} parsed Parsed payload.
 * @param {DOMHelpers} dom DOM helper facade.
 * @returns {HTMLElement} Expense breakdown section.
 */
function createExpenseSection(parsed, dom) {
  return createWageSection({
    parsed,
    dom,
    title: 'Expense breakdown',
    getRows: getExpenseRows,
  });
}

/**
 * Build a wage-report section.
 * @param {{
 *   parsed: Record<string, unknown>,
 *   dom: DOMHelpers,
 *   title: string,
 *   getRows: (parsed: Record<string, unknown>) => Array<[string, unknown]>,
 * }} options Section options.
 * @returns {HTMLElement} Wage-report section element.
 */
function createWageSection(options) {
  const { parsed, dom, title, getRows } = options;
  return createSectionWithRows({
    dom,
    className: SECTION_CLASS,
    title,
    content: createTable(dom, getRows(parsed)),
  });
}

/**
 * Render the calculated wage report.
 * @param {Record<string, unknown>} parsed Parsed payload.
 * @param {DOMHelpers} dom DOM helper facade.
 * @returns {HTMLElement} Presenter root.
 */
function renderRealHourlyWageResult(parsed, dom) {
  const root = createPresenterRoot(dom, ROOT_CLASS);
  const header = dom.createElement('header');
  dom.setClassName(header, HEADER_CLASS);
  dom.appendChild(
    header,
    createTextElement(dom, {
      tag: 'h3',
      className: TITLE_CLASS,
      text: TITLE_TEXT,
    })
  );
  dom.appendChild(
    header,
    createTextElement(dom, {
      tag: 'p',
      className: INTRO_CLASS,
      text: INTRO_TEXT,
    })
  );

  dom.appendChild(root, header);
  dom.appendChild(root, createSummarySection(parsed, dom));
  dom.appendChild(root, createHourSection(parsed, dom));
  dom.appendChild(root, createExpenseSection(parsed, dom));
  return root;
}

/**
 * Return a dash when the supplied condition passes.
 * @param {boolean} condition Condition gate.
 * @returns {string | null} Dash marker or null.
 */
function returnDashIf(condition) {
  return whenOrNull(condition, () => '—');
}

export const createRealHourlyWageReportElement = createParsedJsonPresenter(
  renderRealHourlyWageResult
);

export const realHourlyWagePresenterTestOnly = {
  formatDisplayValue,
  formatNumber,
  humanizeKey,
  getSummaryRows,
  getHourRows,
  getExpenseRows,
  createTable,
  createSummarySection,
  createHourSection,
  createExpenseSection,
  renderRealHourlyWageResult,
};
