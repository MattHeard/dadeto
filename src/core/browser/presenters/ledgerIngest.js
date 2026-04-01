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
const TABLE_HEADER_EXPANDED_CLASS =
  'ledger-ingest-transactions-header-cell--expanded';
const TABLE_HEADER_COLLAPSED_CLASS =
  'ledger-ingest-transactions-header-cell--collapsed';
const TABLE_LABEL_CLASS = 'ledger-ingest-transactions-column-label';
const TABLE_TOGGLE_CLASS = 'ledger-ingest-transactions-column-toggle';
const TABLE_CELL_COLLAPSED_CLASS = 'ledger-ingest-transactions-cell--collapsed';
const TABLE_HOST_CLASS = 'ledger-ingest-transactions-table-host';
const COLLAPSED_BUTTON_TEXT = '(+)';
const EXPANDED_BUTTON_TEXT = '(-)';
const FALLBACK_TAG = 'pre';
const TITLE_TEXT = 'Ledger Ingest';

/**
 * @typedef {object} LedgerIngestTransactionColumn
 * @property {string} label Header label.
 * @property {(transaction: LedgerIngestTransaction) => unknown} getValue Value extractor.
 */

const TRANSACTION_COLUMNS = /** @type {LedgerIngestTransactionColumn[]} */ ([
  {
    label: 'Transaction ID',
    getValue: transaction => transaction.transactionId,
  },
  {
    label: 'Posted date',
    getValue: transaction => transaction.postedDate,
  },
  {
    label: 'Amount',
    getValue: transaction => transaction.amount,
  },
  {
    label: 'Currency',
    getValue: transaction => transaction.currency,
  },
  {
    label: 'Description',
    getValue: transaction => transaction.description,
  },
  {
    label: 'Dedupe key',
    getValue: transaction => transaction.dedupeKey,
  },
  {
    label: 'Source',
    getValue: transaction => transaction.source,
  },
  {
    label: 'Raw index',
    getValue: transaction => transaction.rawIndex,
  },
  {
    label: 'Source record id',
    getValue: transaction => transaction.sourceRecordId,
  },
  {
    label: 'Raw record',
    getValue: transaction => formatJson(transaction.metadata.rawRecord),
  },
]);

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

  const tableHost = dom.createElement('div');
  dom.setClassName(tableHost, TABLE_HOST_CLASS);

  const state = createCanonicalTransactionColumnState();
  const renderTable = () => {
    dom.removeAllChildren(tableHost);
    dom.appendChild(
      tableHost,
      createCanonicalTransactionsTable(
        parsed.canonicalTransactions,
        {
          state,
          rerender: renderTable,
        },
        dom
      )
    );
  };

  renderTable();
  dom.appendChild(section, tableHost);
  return section;
}

/**
 * Build the canonical transactions table.
 * @param {LedgerIngestTransaction[]} transactions Parsed canonical rows.
 * @param {{ state: { collapsedColumns: boolean[] }, rerender: () => void }} options Table state and rerender callback.
 * @param {DOMHelpers} dom DOM helper facade.
 * @returns {HTMLElement} Transactions table.
 */
function createCanonicalTransactionsTable(transactions, options, dom) {
  const table = dom.createElement('table');
  dom.setClassName(table, TABLE_CLASS);

  dom.appendChild(table, createTableHead(options.state, options.rerender, dom));
  dom.appendChild(table, createTableBody(transactions, options.state, dom));
  return table;
}

/**
 * Create the table head for canonical transactions.
 * @param {{ collapsedColumns: boolean[] }} state Column collapse state.
 * @param {() => void} rerender Callback used after toggling columns.
 * @param {DOMHelpers} dom DOM helper facade.
 * @returns {HTMLElement} Table head element.
 */
function createTableHead(state, rerender, dom) {
  const head = dom.createElement('thead');
  dom.setClassName(head, TABLE_HEAD_CLASS);
  const row = dom.createElement('tr');

  getColumnGroups(state.collapsedColumns).forEach(group => {
    dom.appendChild(
      row,
      createTableHeaderCell(group, {
        collapsedColumns: state.collapsedColumns,
        rerender,
        dom,
      })
    );
  });

  dom.appendChild(head, row);
  return head;
}

/**
 * Create the table body for canonical transactions.
 * @param {LedgerIngestTransaction[]} transactions Canonical transaction rows.
 * @param {{ collapsedColumns: boolean[] }} state Column collapse state.
 * @param {DOMHelpers} dom DOM helper facade.
 * @returns {HTMLElement} Table body element.
 */
function createTableBody(transactions, state, dom) {
  const body = dom.createElement('tbody');
  dom.setClassName(body, TABLE_BODY_CLASS);

  transactions.forEach(transaction => {
    dom.appendChild(body, createTransactionRow(transaction, state, dom));
  });

  return body;
}

/**
 * Render one canonical transaction row.
 * @param {LedgerIngestTransaction} transaction Canonical transaction row.
 * @param {{ collapsedColumns: boolean[] }} state Column collapse state.
 * @param {DOMHelpers} dom DOM helper facade.
 * @returns {HTMLElement} Table row element.
 */
function createTransactionRow(transaction, state, dom) {
  const row = dom.createElement('tr');
  dom.setClassName(row, TABLE_ROW_CLASS);

  TRANSACTION_COLUMNS.forEach((column, index) => {
    dom.appendChild(
      row,
      createTransactionCell(column, transaction, {
        collapsed: state.collapsedColumns[index],
        dom,
      })
    );
  });
  return row;
}

/**
 * Create a canonical transaction header cell.
 * @param {{ start: number, length: number, collapsed: boolean }} group Column group metadata.
 * @param {{ collapsedColumns: boolean[], rerender: () => void, dom: DOMHelpers }} options Table state and DOM helpers.
 * @returns {HTMLElement} Table header cell.
 */
function createTableHeaderCell(group, options) {
  const { collapsedColumns, rerender, dom } = options;
  const column = TRANSACTION_COLUMNS[group.start];
  const headerCell = dom.createElement('th');
  dom.setClassName(headerCell, getTableHeaderCellClassName(group.collapsed));
  headerCell.colSpan = group.length;

  if (group.collapsed) {
    dom.appendChild(
      headerCell,
      createColumnToggleButton(dom, COLLAPSED_BUTTON_TEXT, () => {
        expandColumnGroup(collapsedColumns, group.start, group.length);
        rerender();
      })
    );
    return headerCell;
  }

  dom.appendChild(
    headerCell,
    createTextElement(dom, {
      tag: 'span',
      className: TABLE_LABEL_CLASS,
      text: column.label,
    })
  );
  dom.appendChild(
    headerCell,
    createColumnToggleButton(dom, EXPANDED_BUTTON_TEXT, () => {
      collapseColumn(collapsedColumns, group.start);
      rerender();
    })
  );
  return headerCell;
}

/**
 * Create one canonical transaction body cell.
 * @param {LedgerIngestTransactionColumn} column Column definition.
 * @param {LedgerIngestTransaction} transaction Canonical transaction row.
 * @param {{ collapsed: boolean, dom: DOMHelpers }} options Cell rendering options.
 * @returns {HTMLElement} Table cell element.
 */
function createTransactionCell(column, transaction, options) {
  const { collapsed, dom } = options;
  const cell = dom.createElement('td');
  dom.setClassName(cell, getTableCellClassName(collapsed));
  if (collapsed) {
    dom.setTextContent(cell, '');
    return cell;
  }
  dom.setTextContent(cell, formatDisplayValue(column.getValue(transaction)));
  return cell;
}

/**
 * Create a toggle button for a transaction column header.
 * @param {DOMHelpers} dom DOM helper facade.
 * @param {string} text Toggle label.
 * @param {() => void} onClick Click handler.
 * @returns {HTMLElement} Toggle button element.
 */
function createColumnToggleButton(dom, text, onClick) {
  const button = dom.createElement('button');
  dom.setClassName(button, TABLE_TOGGLE_CLASS);
  dom.setType(button, 'button');
  dom.setTextContent(button, text);
  dom.addEventListener(button, 'click', event => {
    event.preventDefault();
    onClick();
  });
  return button;
}

/**
 * Create the initial collapse state for all canonical transaction columns.
 * @returns {{ collapsedColumns: boolean[] }} Column collapse state.
 */
function createCanonicalTransactionColumnState() {
  return {
    collapsedColumns: TRANSACTION_COLUMNS.map(() => false),
  };
}

/**
 * Collapse a single column.
 * @param {boolean[]} collapsedColumns Column collapse state.
 * @param {number} columnIndex Column index.
 * @returns {void}
 */
function collapseColumn(collapsedColumns, columnIndex) {
  collapsedColumns[columnIndex] = true;
}

/**
 * Expand a contiguous group of collapsed columns.
 * @param {boolean[]} collapsedColumns Column collapse state.
 * @param {number} startIndex First collapsed column index.
 * @param {number} length Group length.
 * @returns {void}
 */
function expandColumnGroup(collapsedColumns, startIndex, length) {
  for (let index = startIndex; index < startIndex + length; index += 1) {
    collapsedColumns[index] = false;
  }
}

/**
 * Collect contiguous groups from the column state.
 * @param {boolean[]} collapsedColumns Column collapse state.
 * @returns {Array<{ start: number, length: number, collapsed: boolean }>} Column groups.
 */
function getColumnGroups(collapsedColumns) {
  const groups = [];
  let index = 0;

  while (index < collapsedColumns.length) {
    const collapsed = collapsedColumns[index];
    const length = getColumnGroupLength(collapsedColumns, index);

    groups.push({
      start: index,
      length,
      collapsed,
    });
    index += length;
  }

  return groups;
}

/**
 * Determine the length of a contiguous column group.
 * @param {boolean[]} collapsedColumns Column collapse state.
 * @param {number} startIndex Group start index.
 * @returns {number} Group length.
 */
function getColumnGroupLength(collapsedColumns, startIndex) {
  if (!collapsedColumns[startIndex]) {
    return 1;
  }
  return 1 + getCollapsedRunLength(collapsedColumns, startIndex + 1);
}

/**
 * Count the remaining items in a collapsed run.
 * @param {boolean[]} collapsedColumns Column collapse state.
 * @param {number} index Current index within the run.
 * @returns {number} Remaining collapsed items.
 */
function getCollapsedRunLength(collapsedColumns, index) {
  if (index >= collapsedColumns.length) {
    return 0;
  }
  return getCollapsedRunLengthFromIndex(collapsedColumns, index);
}

/**
 * Count the remaining items in a collapsed run starting from an in-bounds index.
 * @param {boolean[]} collapsedColumns Column collapse state.
 * @param {number} index Current index within the run.
 * @returns {number} Remaining collapsed items.
 */
function getCollapsedRunLengthFromIndex(collapsedColumns, index) {
  if (!collapsedColumns[index]) {
    return 0;
  }
  return 1 + getCollapsedRunLength(collapsedColumns, index + 1);
}

/**
 * Compute the table header cell class string.
 * @param {boolean} collapsed Whether the group is collapsed.
 * @returns {string} Class string.
 */
function getTableHeaderCellClassName(collapsed) {
  if (collapsed) {
    return `${TABLE_HEADER_CELL_CLASS} ${TABLE_HEADER_COLLAPSED_CLASS}`;
  }
  return `${TABLE_HEADER_CELL_CLASS} ${TABLE_HEADER_EXPANDED_CLASS}`;
}

/**
 * Compute the table body cell class string.
 * @param {boolean} collapsed Whether the column is collapsed.
 * @returns {string} Class string.
 */
function getTableCellClassName(collapsed) {
  if (collapsed) {
    return `${TABLE_CELL_CLASS} ${TABLE_CELL_COLLAPSED_CLASS}`;
  }
  return TABLE_CELL_CLASS;
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
  switch (typeof value) {
    case 'number':
      return value;
    default:
      return 0;
  }
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
  formatDisplayValue,
  renderLedgerIngestReport,
  getSummaryValue,
  getSummaryNumber,
  getCollapsedRunLength,
};
