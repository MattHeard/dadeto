import { parseJsonObject } from '../jsonValueHelpers.js';
import {
  renderParsedPresenter,
  createPresenterRoot,
} from './browserPresentersCore.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */

// Ledger ingest keeps a compact report layout rather than a list-driven mapping.
const ROOT_CLASS = 'ledger-ingest-output';
const HEADER_CLASS = 'ledger-ingest-header';
const TITLE_CLASS = 'ledger-ingest-title';
const OVERVIEW_CLASS = 'ledger-ingest-overview';
const OVERVIEW_ROW_CLASS = 'ledger-ingest-overview-row';
const OVERVIEW_LABEL_CLASS = 'ledger-ingest-overview-label';
const OVERVIEW_VALUE_CLASS = 'ledger-ingest-overview-value';
const SECTION_CLASS = 'ledger-ingest-section';
const SECTION_TITLE_CLASS = 'ledger-ingest-section-title';
const SECTION_BODY_CLASS = 'ledger-ingest-section-body';
const TABLE_CLASS = 'ledger-ingest-transactions-table';
const TABLE_EMPTY_CLASS = 'ledger-ingest-transactions-empty';
const TABLE_HEAD_CLASS = 'ledger-ingest-transactions-head';
const TABLE_BODY_CLASS = 'ledger-ingest-transactions-body';
const TABLE_ROW_CLASS = 'ledger-ingest-transactions-row';
const TABLE_CELL_CLASS = 'ledger-ingest-transactions-cell';
const TABLE_HEADER_CELL_CLASS = 'ledger-ingest-transactions-header-cell';
const DETAILS_CLASS = 'ledger-ingest-transactions-details';
const DETAILS_SUMMARY_CLASS = 'ledger-ingest-transactions-details-summary';
const DETAILS_TABLE_CLASS = 'ledger-ingest-transactions-details-table';
const DETAILS_ROW_CLASS = 'ledger-ingest-transactions-details-row';
const DETAILS_LABEL_CLASS = 'ledger-ingest-transactions-details-label';
const DETAILS_VALUE_CLASS = 'ledger-ingest-transactions-details-value';
const FALLBACK_TAG = 'pre';
const TITLE_TEXT = 'Ledger Ingest';

/**
 * @typedef {object} LedgerIngestReport
 * @property {string} fixture - Source label for the rendered report.
 * @property {string} inputMode - Input mode used to produce the report.
 * @property {Array<LedgerIngestTransaction>} canonicalTransactions - Normalized transactions kept by the core.
 * @property {Array<Record<string, unknown>>} duplicateReports - Duplicate rows reported by the core.
 * @property {Array<Record<string, unknown>>} errorReports - Structured row errors reported by the core.
 * @property {Record<string, unknown>} summary - Aggregate counts and summary metadata.
 * @property {Record<string, unknown>} policy - Dedupe policy used for the run.
 */

/**
 * @typedef {object} LedgerIngestTransaction
 * @property {string} transactionId Deterministic row identifier.
 * @property {string} dedupeKey Dedupe key used to detect duplicates.
 * @property {string} source Source label for the run.
 * @property {string} postedDate Normalized posting date.
 * @property {number} amount Signed transaction amount.
 * @property {string} currency Normalized currency code.
 * @property {string} description Normalized transaction description.
 * @property {number} rawIndex Original row index in the imported batch.
 * @property {string | undefined} sourceRecordId Optional upstream record id.
 * @property {{ rawRecord: Record<string, unknown> }} metadata Raw record retained for auditing.
 */

/**
 * Parse the LEDG1 report payload.
 * @param {string} inputString Serialized toy output payload.
 * @returns {LedgerIngestReport | null} Parsed report object or null on invalid JSON.
 */
function parseReport(inputString) {
  return /** @type {LedgerIngestReport | null} */ (
    parseJsonObject(inputString)
  );
}

/**
 * Create a text node element with optional class name.
 * @param {DOMHelpers} dom DOM helper facade.
 * @param {{ tag: string, className: string, text: string }} options Element details.
 * @returns {HTMLElement} Created element.
 */
function createTextElement(dom, options) {
  const node = dom.createElement(options.tag);
  dom.setClassName(node, options.className);
  dom.setTextContent(node, options.text);
  return node;
}

/**
 * Format a value for JSON display.
 * @param {unknown} value Input value.
 * @returns {string} Pretty-printed JSON string.
 */
function formatJson(value) {
  const text = JSON.stringify(value, null, 2);
  if (text === undefined) {
    return 'null';
  }
  return text;
}

/**
 * Create the output fallback when JSON parsing fails.
 * @param {string} inputString Raw output text.
 * @param {DOMHelpers} dom DOM helper facade.
 * @returns {HTMLElement} Preformatted fallback element.
 */
function createFallbackElement(inputString, dom) {
  const fallback = dom.createElement(FALLBACK_TAG);
  dom.setTextContent(fallback, inputString);
  return fallback;
}

/**
 * Build the output header with the title.
 * @param {DOMHelpers} dom DOM helper facade.
 * @returns {HTMLElement} Header wrapper.
 */
function createHeader(dom) {
  const header = dom.createElement('div');
  dom.setClassName(header, HEADER_CLASS);

  const title = createTextElement(dom, {
    tag: 'h3',
    className: TITLE_CLASS,
    text: TITLE_TEXT,
  });

  dom.appendChild(header, title);
  return header;
}

/**
 * Convert a row label/value pair into a definition-list row.
 * @param {DOMHelpers} dom DOM helper facade.
 * @param {string} label Row label.
 * @param {unknown} value Row value.
 * @returns {HTMLElement} Definition list row.
 */
function createOverviewRow(dom, label, value) {
  const row = dom.createElement('div');
  dom.setClassName(row, OVERVIEW_ROW_CLASS);

  const labelNode = createTextElement(dom, {
    tag: 'strong',
    className: OVERVIEW_LABEL_CLASS,
    text: label,
  });
  const valueNode = createTextElement(dom, {
    tag: 'span',
    className: OVERVIEW_VALUE_CLASS,
    text: String(value),
  });

  dom.appendChild(row, labelNode);
  dom.appendChild(row, valueNode);
  return row;
}

/**
 * Build the compact overview list for the report.
 * @param {LedgerIngestReport} parsed Parsed report object.
 * @param {DOMHelpers} dom DOM helper facade.
 * @returns {HTMLElement} Overview container.
 */
function createOverview(parsed, dom) {
  const overview = dom.createElement('div');
  dom.setClassName(overview, OVERVIEW_CLASS);

  const rows = [
    ['Fixture', parsed.fixture],
    ['Input mode', parsed.inputMode],
    ['Raw records', getSummaryNumber(parsed, 'rawRecords')],
    [
      'Canonical transactions',
      getSummaryNumber(parsed, 'canonicalTransactions'),
    ],
    ['Duplicates detected', getSummaryNumber(parsed, 'duplicatesDetected')],
    ['Errors detected', getSummaryNumber(parsed, 'errorsDetected')],
  ];

  rows.forEach(([label, value]) => {
    dom.appendChild(overview, createOverviewRow(dom, label, value));
  });
  return overview;
}

/**
 * Create a standard section wrapper with a title heading.
 * @param {DOMHelpers} dom DOM helper facade.
 * @param {string} className Section-specific class name.
 * @param {string} title Section title.
 * @returns {HTMLElement} Section wrapper element.
 */
function createSectionWithHeading(dom, className, title) {
  const section = dom.createElement('section');
  dom.setClassName(section, `${SECTION_CLASS} ${className}`);

  const heading = createTextElement(dom, {
    tag: 'h4',
    className: SECTION_TITLE_CLASS,
    text: title,
  });

  dom.appendChild(section, heading);
  return section;
}

/**
 * Build the canonical transaction table section.
 * @param {LedgerIngestReport} parsed Parsed report object.
 * @param {DOMHelpers} dom DOM helper facade.
 * @returns {HTMLElement} Canonical transaction section.
 */
function createCanonicalTransactionsSection(parsed, dom) {
  const section = createSectionWithHeading(
    dom,
    'ledger-ingest-section--canonical-transactions',
    'Canonical transactions'
  );

  if (parsed.canonicalTransactions.length === 0) {
    dom.appendChild(
      section,
      createEmptyStateParagraph(dom, 'No canonical transactions.')
    );
    return section;
  }

  dom.appendChild(
    section,
    createCanonicalTransactionsTable(parsed.canonicalTransactions, dom)
  );
  return section;
}

/**
 * Build the canonical transactions table.
 * @param {LedgerIngestTransaction[]} transactions Parsed canonical rows.
 * @param {DOMHelpers} dom DOM helper facade.
 * @returns {HTMLElement} Transactions table.
 */
function createCanonicalTransactionsTable(transactions, dom) {
  const table = dom.createElement('table');
  dom.setClassName(table, TABLE_CLASS);

  dom.appendChild(table, createTableHead(dom));
  dom.appendChild(table, createTableBody(transactions, dom));
  return table;
}

/**
 * Create the table head for canonical transactions.
 * @param {DOMHelpers} dom DOM helper facade.
 * @returns {HTMLElement} Table head element.
 */
function createTableHead(dom) {
  const head = dom.createElement('thead');
  dom.setClassName(head, TABLE_HEAD_CLASS);
  const row = dom.createElement('tr');

  const headers = [
    'Transaction ID',
    'Posted date',
    'Amount',
    'Currency',
    'Description',
    'Columns',
  ];

  headers.forEach(label => {
    dom.appendChild(
      row,
      createTextElement(dom, {
        tag: 'th',
        className: TABLE_HEADER_CELL_CLASS,
        text: label,
      })
    );
  });

  dom.appendChild(head, row);
  return head;
}

/**
 * Create the table body for canonical transactions.
 * @param {LedgerIngestTransaction[]} transactions Canonical transaction rows.
 * @param {DOMHelpers} dom DOM helper facade.
 * @returns {HTMLElement} Table body element.
 */
function createTableBody(transactions, dom) {
  const body = dom.createElement('tbody');
  dom.setClassName(body, TABLE_BODY_CLASS);

  transactions.forEach(transaction => {
    dom.appendChild(body, createTransactionRow(transaction, dom));
  });

  return body;
}

/**
 * Render one canonical transaction row.
 * @param {LedgerIngestTransaction} transaction Canonical transaction row.
 * @param {DOMHelpers} dom DOM helper facade.
 * @returns {HTMLElement} Table row element.
 */
function createTransactionRow(transaction, dom) {
  const row = dom.createElement('tr');
  dom.setClassName(row, TABLE_ROW_CLASS);

  const cells = [
    transaction.transactionId,
    transaction.postedDate,
    transaction.amount,
    transaction.currency,
    transaction.description,
  ];

  cells.forEach(cell => {
    dom.appendChild(
      row,
      createTextElement(dom, {
        tag: 'td',
        className: TABLE_CELL_CLASS,
        text: formatDisplayValue(cell),
      })
    );
  });

  dom.appendChild(row, createTransactionDetails(transaction, dom));
  return row;
}

/**
 * Build the collapsible advanced-columns cell for a canonical transaction.
 * @param {LedgerIngestTransaction} transaction Canonical transaction row.
 * @param {DOMHelpers} dom DOM helper facade.
 * @returns {HTMLElement} Table cell containing the disclosure control.
 */
function createTransactionDetails(transaction, dom) {
  const cell = dom.createElement('td');
  dom.setClassName(cell, TABLE_CELL_CLASS);

  const details = dom.createElement('details');
  dom.setClassName(details, DETAILS_CLASS);

  const summary = createTextElement(dom, {
    tag: 'summary',
    className: DETAILS_SUMMARY_CLASS,
    text: 'Show 5 columns',
  });

  dom.appendChild(details, summary);
  dom.appendChild(details, createTransactionDetailsTable(transaction, dom));
  dom.appendChild(cell, details);
  return cell;
}

/**
 * Build the table used inside the collapse control.
 * @param {LedgerIngestTransaction} transaction Canonical transaction row.
 * @param {DOMHelpers} dom DOM helper facade.
 * @returns {HTMLElement} Details table element.
 */
function createTransactionDetailsTable(transaction, dom) {
  const table = dom.createElement('table');
  dom.setClassName(table, DETAILS_TABLE_CLASS);

  const body = dom.createElement('tbody');
  const rows = [
    ['Dedupe key', transaction.dedupeKey],
    ['Source', transaction.source],
    ['Raw index', transaction.rawIndex],
    ['Source record id', transaction.sourceRecordId],
    ['Raw record', transaction.metadata.rawRecord],
  ];

  rows.forEach(([label, value]) => {
    const row = dom.createElement('tr');
    dom.setClassName(row, DETAILS_ROW_CLASS);
    dom.appendChild(
      row,
      createTextElement(dom, {
        tag: 'th',
        className: DETAILS_LABEL_CLASS,
        text: label,
      })
    );
    let cellText = formatDisplayValue(value);
    if (label === 'Raw record') {
      cellText = formatJson(value);
    }
    dom.appendChild(
      row,
      createTextElement(dom, {
        tag: 'td',
        className: DETAILS_VALUE_CLASS,
        text: cellText,
      })
    );
    dom.appendChild(body, row);
  });

  dom.appendChild(table, body);
  return table;
}

/**
 * Create the empty state paragraph for an empty canonical table.
 * @param {DOMHelpers} dom DOM helper facade.
 * @param {string} text Empty-state message.
 * @returns {HTMLElement} Paragraph element.
 */
function createEmptyStateParagraph(dom, text) {
  return createTextElement(dom, {
    tag: 'p',
    className: TABLE_EMPTY_CLASS,
    text,
  });
}

/**
 * Normalize table cell content into display text.
 * @param {unknown} value Cell value.
 * @returns {string} Display string.
 */
function formatDisplayValue(value) {
  const replacements = {
    undefined: '—',
    null: '—',
    '': '—',
  };
  if (Object.hasOwn(replacements, value)) {
    return replacements[value];
  }
  return String(value);
}

/**
 * Read a numeric summary value with a safe fallback.
 * @param {LedgerIngestReport} parsed Parsed report object.
 * @param {'rawRecords' | 'canonicalTransactions' | 'duplicatesDetected' | 'errorsDetected'} key Summary key.
 * @returns {number} Summary value or zero when absent.
 */
function getSummaryNumber(parsed, key) {
  return getSummaryValue(parsed.summary, key);
}

/**
 * Read a numeric value from a summary object with a safe fallback.
 * @param {Record<string, unknown> | undefined} summary Summary object.
 * @param {'rawRecords' | 'canonicalTransactions' | 'duplicatesDetected' | 'errorsDetected'} key Summary key.
 * @returns {number} Summary value or zero when absent.
 */
function getSummaryValue(summary, key) {
  const value = getSummaryCandidate(summary, key);
  return getSummaryNumberValue(value);
}

/**
 * Read the raw candidate value from the summary object.
 * @param {Record<string, unknown> | undefined} summary Summary object.
 * @param {'rawRecords' | 'canonicalTransactions' | 'duplicatesDetected' | 'errorsDetected'} key Summary key.
 * @returns {unknown} Raw summary candidate.
 */
function getSummaryCandidate(summary, key) {
  return summary && summary[key];
}

/**
 * Normalize a summary candidate to a number.
 * @param {unknown} value Raw summary candidate.
 * @returns {number} Summary value or zero when absent.
 */
function getSummaryNumberValue(value) {
  if (typeof value === 'number') {
    return value;
  }
  return 0;
}

/**
 * Build a JSON details section.
 * @param {DOMHelpers} dom DOM helper facade.
 * @param {{ title: string, value: unknown, className: string }} options Section details.
 * @returns {HTMLElement} Section element.
 */
function createJsonSection(dom, options) {
  const section = createSectionWithHeading(
    dom,
    options.className,
    options.title
  );
  const body = dom.createElement('pre');
  dom.setClassName(body, SECTION_BODY_CLASS);
  dom.setTextContent(body, formatJson(options.value));
  dom.appendChild(section, body);
  return section;
}

/**
 * Append all report sections to the presenter root.
 * @param {HTMLElement} root Presenter root.
 * @param {DOMHelpers} dom DOM helper facade.
 * @param {LedgerIngestReport} parsed Parsed report object.
 * @returns {void}
 */
function appendReportSections(root, dom, parsed) {
  dom.appendChild(root, createCanonicalTransactionsSection(parsed, dom));

  const sections = [
    {
      title: 'Duplicate reports',
      value: parsed.duplicateReports,
      className: 'ledger-ingest-section--duplicate-reports',
    },
    {
      title: 'Error reports',
      value: parsed.errorReports,
      className: 'ledger-ingest-section--error-reports',
    },
    {
      title: 'Summary',
      value: parsed.summary,
      className: 'ledger-ingest-section--summary',
    },
    {
      title: 'Policy',
      value: parsed.policy,
      className: 'ledger-ingest-section--policy',
    },
  ];

  sections.forEach(section => {
    dom.appendChild(root, createJsonSection(dom, section));
  });
}

/**
 * Render a parsed LEDG1 report.
 * @param {LedgerIngestReport} parsed Parsed report object.
 * @param {DOMHelpers} dom DOM helper facade.
 * @returns {HTMLElement} Presenter root element.
 */
function renderLedgerIngestReport(parsed, dom) {
  const root = createPresenterRoot(dom, ROOT_CLASS);
  dom.appendChild(root, createHeader(dom));
  dom.appendChild(root, createOverview(parsed, dom));
  appendReportSections(root, dom, parsed);
  return root;
}

/**
 * Create the LEDG1-specific output presenter.
 * @param {string} inputString Raw output text to render.
 * @param {DOMHelpers} dom DOM helper facade.
 * @returns {HTMLElement} Presenter root element.
 */
export function createLedgerIngestReportElement(inputString, dom) {
  return renderParsedPresenter({
    inputString,
    dom,
    parse: parseReport,
    render: renderLedgerIngestReport,
    createFallback: createFallbackElement,
  });
}

export const ledgerIngestReportTestOnly = {
  parseReport,
  formatJson,
  createOverview,
  createJsonSection,
  createCanonicalTransactionsSection,
  createCanonicalTransactionsTable,
  createTableHead,
  createTableBody,
  createTransactionRow,
  createTransactionDetails,
  createTransactionDetailsTable,
  formatDisplayValue,
  renderLedgerIngestReport,
  getSummaryValue,
  getSummaryNumber,
};
