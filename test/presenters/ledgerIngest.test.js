import { describe, expect, test } from '@jest/globals';
import {
  createLedgerIngestReportElement,
  ledgerIngestReportTestOnly,
} from '../../src/core/browser/presenters/ledgerIngest.js';

/**
 * Build a minimal DOM facade for presenter tests.
 * @returns {{ createElement: (tag: string) => { tag: string, className: string, textContent: string, children: unknown[], colSpan: number, href: string, listeners: Record<string, (event: { preventDefault: () => void }) => void> }, setClassName: (node: { className: string }, className: string) => void, setTextContent: (node: { textContent: string }, text: string) => void, appendChild: (parent: { children: unknown[] }, child: unknown) => void, addEventListener: (node: { listeners: Record<string, (event: { preventDefault: () => void }) => void> }, event: string, handler: (event: { preventDefault: () => void }) => void) => void, removeAllChildren: (node: { children: unknown[] }) => void }} DOM mock.
 */
function createMockDom() {
  return {
    createElement: tag => ({
      tag,
      className: '',
      textContent: '',
      children: [],
      colSpan: 1,
      href: '',
      style: {},
      listeners: {},
    }),
    setClassName: (node, className) => {
      node.className = className;
    },
    setTextContent: (node, text) => {
      node.textContent = text;
    },
    appendChild: (parent, child) => {
      parent.children.push(child);
    },
    addEventListener: (node, event, handler) => {
      node.listeners[event] = handler;
    },
    removeAllChildren: node => {
      node.children.length = 0;
    },
  };
}

/**
 * Trigger a click listener on a mocked node.
 * @param {{ listeners: Record<string, (event: { preventDefault: () => void }) => void> }} node Node with listeners.
 * @returns {void}
 */
function click(node) {
  node.listeners.click?.({
    preventDefault() {},
  });
}

describe('createLedgerIngestReportElement', () => {
  test('returns a fallback pre element when JSON is invalid', () => {
    const dom = createMockDom();
    const input = 'not json';

    const result = createLedgerIngestReportElement(input, dom);

    expect(result.tag).toBe('pre');
    expect(result.textContent).toBe(input);
  });

  test('renders canonical transactions with collapsible column groups', () => {
    const dom = createMockDom();
    const payload = {
      fixture: 'jsonImport',
      inputMode: 'json',
      canonicalTransactions: [
        {
          transactionId: 'ember-bank-us:2026-03-01|12|coffee shop:0',
          dedupeKey: '2026-03-01|12|coffee shop',
          source: 'ember-bank-us',
          postedDate: '2026-03-01',
          rawIndex: 0,
          amount: 12,
          currency: 'USD',
          description: 'coffee shop',
          metadata: {
            rawRecord: {
              id: 'row-1',
              date: '2026-03-01',
            },
          },
        },
      ],
      duplicateReports: [
        {
          policyName: 'posted-date-amount-description',
        },
      ],
      errorReports: [],
      summary: {
        rawRecords: 3,
        canonicalTransactions: 1,
        duplicatesDetected: 1,
        errorsDetected: 0,
      },
      policy: {
        name: 'posted-date-amount-description',
      },
    };

    const element = createLedgerIngestReportElement(
      JSON.stringify(payload),
      dom
    );
    const [header, overview, canonical, duplicates, errors, summary, policy] =
      element.children;
    expect(element.children).toHaveLength(7);
    const tableHost = canonical.children[1];
    expect(tableHost.tag).toBe('div');
    const getTable = () => tableHost.children[0];
    const getHeaderRow = () => getTable().children[0].children[0];
    const getBodyRow = () => getTable().children[1].children[0];

    expect(element.tag).toBe('div');
    expect(element.className).toBe('ledger-ingest-output');
    expect(header.className).toBe('ledger-ingest-header');
    expect(header.children[0].textContent).toBe('Ledger Ingest');
    expect(overview.className).toBe('ledger-ingest-overview');
    expect(overview.children[0].children[0].textContent).toBe('Fixture');
    expect(overview.children[0].children[1].textContent).toBe('jsonImport');
    expect(overview.children[2].children[1].textContent).toBe('3');
    expect(overview.children[3].children[1].textContent).toBe('1');
    expect(overview.children[4].children[1].textContent).toBe('1');
    expect(overview.children[5].children[1].textContent).toBe('0');
    expect({
      title: canonical.children[0].textContent,
      hostClass: tableHost.className,
      tableTag: getTable().tag,
      tableClass: getTable().className,
    }).toEqual({
      title: 'Canonical transactions',
      hostClass: 'ledger-ingest-transactions-table-host',
      tableTag: 'table',
      tableClass: 'ledger-ingest-transactions-table',
    });
    expect(duplicates.className).toBe(
      'ledger-ingest-section ledger-ingest-section--duplicate-reports'
    );
    expect(errors.className).toBe(
      'ledger-ingest-section ledger-ingest-section--error-reports'
    );
    expect(summary.className).toBe(
      'ledger-ingest-section ledger-ingest-section--summary'
    );
    expect(policy.className).toBe(
      'ledger-ingest-section ledger-ingest-section--policy'
    );
    expect(
      getHeaderRow().children.map(cell => cell.children[0].textContent)
    ).toEqual([
      'Transaction ID',
      'Posted date',
      'Amount',
      'Currency',
      'Description',
      'Dedupe key',
      'Source',
      'Raw index',
      'Source record id',
      'Raw record',
    ]);
    expect({
      tag: getHeaderRow().children[0].children[1].tag,
      href: getHeaderRow().children[0].children[1].href,
      text: getHeaderRow().children[0].children[1].textContent,
    }).toEqual({ tag: 'a', href: '#', text: '(-)' });
    const row = getBodyRow();
    expect(row.children.map(child => child.textContent)).toEqual([
      'ember-bank-us:2026-03-01|12|coffee shop:0',
      '2026-03-01',
      '12',
      'USD',
      'coffee shop',
      '2026-03-01|12|coffee shop',
      'ember-bank-us',
      '0',
      '—',
      expect.stringContaining('"id": "row-1"'),
    ]);

    click(getHeaderRow().children[0].children[1]);

    expect({
      colSpan: getHeaderRow().children[0].colSpan,
      headerChildren: getHeaderRow().children[0].children.length,
      marker: getHeaderRow().children[0].children[0].textContent,
      transactionId: getBodyRow().children[0].textContent,
      postedDate: getBodyRow().children[1].textContent,
    }).toEqual({
      colSpan: 1,
      headerChildren: 1,
      marker: '(+)',
      transactionId: '',
      postedDate: '2026-03-01',
    });

    click(getHeaderRow().children[1].children[1]);

    expect({
      colSpan: getHeaderRow().children[0].colSpan,
      headerChildren: getHeaderRow().children[0].children.length,
      marker: getHeaderRow().children[0].children[0].textContent,
      transactionId: getBodyRow().children[0].textContent,
      postedDate: getBodyRow().children[1].textContent,
    }).toEqual({
      colSpan: 2,
      headerChildren: 1,
      marker: '(+)',
      transactionId: '',
      postedDate: '',
    });

    click(getHeaderRow().children[0].children[0]);

    expect({
      firstGroupSpan: getHeaderRow().children[0].colSpan,
      firstGroupLabel: getHeaderRow().children[0].children[0].textContent,
      firstGroupToggle: getHeaderRow().children[0].children[1].textContent,
      secondGroupLabel: getHeaderRow().children[1].children[0].textContent,
      secondGroupToggle: getHeaderRow().children[1].children[1].textContent,
      transactionId: getBodyRow().children[0].textContent,
      postedDate: getBodyRow().children[1].textContent,
    }).toEqual({
      firstGroupSpan: 1,
      firstGroupLabel: 'Transaction ID',
      firstGroupToggle: '(-)',
      secondGroupLabel: 'Posted date',
      secondGroupToggle: '(-)',
      transactionId: 'ember-bank-us:2026-03-01|12|coffee shop:0',
      postedDate: '2026-03-01',
    });

    expect({
      duplicateTitle: duplicates.children[0].textContent,
      errorTitle: errors.children[0].textContent,
      summaryTitle: summary.children[0].textContent,
      summaryBody: summary.children[1].textContent,
      policyTitle: policy.children[0].textContent,
      policyBody: policy.children[1].textContent,
    }).toEqual({
      duplicateTitle: 'Duplicate reports',
      errorTitle: 'Error reports',
      summaryTitle: 'Summary',
      summaryBody: expect.stringContaining('"rawRecords": 3'),
      policyTitle: 'Policy',
      policyBody: expect.stringContaining(
        '"name": "posted-date-amount-description"'
      ),
    });
  });
});

describe('createLedgerIngestReportElement storage and fallback states', () => {
  test('renders storage details when the report includes storage data', () => {
    const dom = createMockDom();
    const payload = {
      fixture: 'jsonImport',
      inputMode: 'json',
      canonicalTransactions: [],
      duplicateReports: [],
      errorReports: [],
      summary: {
        rawRecords: 0,
        canonicalTransactions: 0,
        duplicatesDetected: 0,
        errorsDetected: 0,
      },
      policy: {
        name: 'posted-date-amount-description',
      },
      storage: {
        storageKey: 'LEDG3',
        beforeCount: 0,
        afterCount: 1,
        actions: [
          {
            action: 'insert',
            mergeKey: 'merge-key',
            transactionId: 'tx-1',
          },
        ],
        transactions: [
          {
            transactionId: 'tx-1',
          },
        ],
      },
    };

    const element = createLedgerIngestReportElement(
      JSON.stringify(payload),
      dom
    );
    const storage = element.children[7];
    expect(element.children).toHaveLength(8);

    expect(storage.className).toBe(
      'ledger-ingest-section ledger-ingest-section--storage'
    );
    expect(storage.children[0].textContent).toBe('Storage');
    expect(storage.children[1].textContent).toContain('"storageKey": "LEDG3"');
    expect(storage.children[1].textContent).toContain('"beforeCount": 0');
    expect(storage.children[1].textContent).toContain('"afterCount": 1');
    expect(storage.className).toBe(
      'ledger-ingest-section ledger-ingest-section--storage'
    );
  });

  test('renders an empty canonical transaction state when there are no rows', () => {
    const dom = createMockDom();
    const payload = {
      fixture: 'jsonImport',
      inputMode: 'json',
      canonicalTransactions: [],
      duplicateReports: [],
      errorReports: [],
      summary: {
        rawRecords: 0,
        canonicalTransactions: 0,
        duplicatesDetected: 0,
        errorsDetected: 0,
      },
      policy: {
        name: 'posted-date-amount-description',
      },
    };

    const element = createLedgerIngestReportElement(
      JSON.stringify(payload),
      dom
    );
    const canonical = element.children[2];

    expect(canonical.children[1].tag).toBe('p');
    expect(canonical.children[1].className).toBe(
      'ledger-ingest-transactions-empty'
    );
    expect(canonical.children[1].textContent).toBe(
      'No canonical transactions.'
    );
    expect(canonical.className).toBe(
      'ledger-ingest-section ledger-ingest-section--canonical-transactions'
    );
  });

  test('covers helper fallbacks for missing summary data', () => {
    expect(ledgerIngestReportTestOnly.formatJson(undefined)).toBe('null');
    expect(ledgerIngestReportTestOnly.formatDisplayValue('')).toBe('—');
    expect(ledgerIngestReportTestOnly.formatDisplayValue(undefined)).toBe('—');
    expect(
      ledgerIngestReportTestOnly.getSummaryValue(
        {
          rawRecords: 'not-a-number',
        },
        'rawRecords'
      )
    ).toBe(0);
    expect(
      ledgerIngestReportTestOnly.getSummaryValue(
        {
          rawRecords: 7,
        },
        'rawRecords'
      )
    ).toBe(7);
    expect(ledgerIngestReportTestOnly.getCollapsedRunLength([], 0)).toBe(0);
    expect(
      ledgerIngestReportTestOnly.getCollapsedRunLength([true, false], 0)
    ).toBe(1);
    expect(
      ledgerIngestReportTestOnly.getCollapsedRunLength([true, false], 1)
    ).toBe(0);
    expect(
      ledgerIngestReportTestOnly.getCollapsedRunLengthFromIndex(
        [true, false],
        0
      )
    ).toBe(1);
    expect(
      ledgerIngestReportTestOnly.getCollapsedRunLengthFromIndex([true, true], 0)
    ).toBe(2);
    expect(
      ledgerIngestReportTestOnly.getCollapsedRunLengthFromIndex([false], 0)
    ).toBe(0);
    const section = { style: {} };
    ledgerIngestReportTestOnly.setTableSectionVerticalAlign(section);
    expect(section.style.verticalAlign).toBe('top');
  });

  test('returns early when the table section is missing or lacks a style object', () => {
    expect(() =>
      ledgerIngestReportTestOnly.setTableSectionVerticalAlign(undefined)
    ).not.toThrow();

    const section = {};
    ledgerIngestReportTestOnly.setTableSectionVerticalAlign(section);
    expect(section.style).toBeUndefined();
  });

  test('covers collapsed-column grouping and expansion boundaries', () => {
    const helpers = ledgerIngestReportTestOnly;
    expect(helpers.getColumnGroups([])).toEqual([]);
    expect(helpers.getColumnGroupLength([false, true, true], 0)).toBe(1);
    expect(helpers.getColumnGroupLength([false, true, true], 1)).toBe(2);
    expect(helpers.getCollapsedRunLength([true, true], 2)).toBe(0);
    expect(helpers.getCollapsedRunLengthFromIndex([true, true, false], 0)).toBe(
      2
    );
    expect(helpers.getColumnGroups([false, true, true, false])).toEqual([
      { start: 0, length: 1, collapsed: false },
      { start: 1, length: 2, collapsed: true },
      { start: 3, length: 1, collapsed: false },
    ]);
    const state = helpers.createCanonicalTransactionColumnState();
    expect(state.collapsedColumns.every(value => value === false)).toBe(true);
    helpers.collapseColumn(state.collapsedColumns, 2);
    expect(state.collapsedColumns[2]).toBe(true);
    helpers.expandColumnGroup(state.collapsedColumns, 1, 3);
    expect(state.collapsedColumns.slice(1, 4)).toEqual([false, false, false]);
  });

  test('covers display normalization and collapsed class variants', () => {
    const helpers = ledgerIngestReportTestOnly;
    expect(helpers.getDisplayText(null)).toBe('—');
    expect(helpers.getDisplayText(undefined)).toBe('—');
    expect(helpers.getDisplayText(0)).toBe('0');
    expect(helpers.getDisplayText(false)).toBe('false');
    expect(helpers.getTableHeaderCellClassName(true)).toContain('--collapsed');
    expect(helpers.getTableHeaderCellClassName(false)).toContain('--expanded');
    expect(helpers.getTableCellClassName(true)).toContain('--collapsed');
    expect(helpers.getTableCellClassName(false)).toBe(
      'ledger-ingest-transactions-cell'
    );
  });

  test('covers primitive DOM helper branches and table cell rendering', () => {
    const helpers = ledgerIngestReportTestOnly;
    const dom = createMockDom();
    const text = helpers.createTextElement(dom, {
      tag: 'span',
      className: 'example',
      text: 'value',
    });
    expect(text).toMatchObject({
      tag: 'span',
      className: 'example',
      textContent: 'value',
    });
    const header = helpers.createHeader(dom);
    expect(header.tag).toBe('div');
    expect(header.className).toBe('ledger-ingest-header');
    expect(header.children[0].tag).toBe('h3');
    expect(header.children[0].className).toBe('ledger-ingest-title');
    expect(header.children[0].textContent).toBe('Ledger Ingest');
    const overview = helpers.createOverview(
      {
        fixture: 'fixture',
        inputMode: 'mode',
        summary: {
          rawRecords: 1,
          canonicalTransactions: 2,
          duplicatesDetected: 3,
          errorsDetected: 4,
        },
      },
      dom
    );
    expect(overview.tag).toBe('div');
    expect(overview.className).toBe('ledger-ingest-overview');
    expect(overview.children.map(row => row.children[0].textContent)).toEqual([
      'Fixture',
      'Input mode',
      'Raw records',
      'Canonical transactions',
      'Duplicates detected',
      'Errors detected',
    ]);
    expect(overview.children.map(row => row.children[1].textContent)).toEqual([
      'fixture',
      'mode',
      '1',
      '2',
      '3',
      '4',
    ]);
    const overviewRow = helpers.createOverviewRow(dom, 'Label', null);
    expect(overviewRow.tag).toBe('div');
    expect(overviewRow.className).toBe('ledger-ingest-overview-row');
    expect(overviewRow.children[0].className).toBe(
      'ledger-ingest-overview-label'
    );
    expect(overviewRow.children[0].tag).toBe('strong');
    expect(overviewRow.children[1].className).toBe(
      'ledger-ingest-overview-value'
    );
    expect(overviewRow.children[1].tag).toBe('span');
    expect(overviewRow.children[1].textContent).toBe('null');
    const empty = helpers.createEmptyStateParagraph(dom, 'Empty');
    expect(empty.tag).toBe('p');
    expect(empty.className).toBe('ledger-ingest-transactions-empty');
    expect(empty.textContent).toBe('Empty');
    expect(
      helpers.getSummaryCandidate(undefined, 'rawRecords')
    ).toBeUndefined();
    expect(helpers.getSummaryNumberValue(3)).toBe(3);
    expect(helpers.getSummaryNumberValue('3')).toBe(0);

    const transaction = {
      transactionId: 'tx',
      postedDate: '2026-01-01',
      amount: 4,
      currency: 'USD',
      description: 'desc',
      dedupeKey: 'key',
      source: 'bank',
      rawIndex: 0,
      metadata: { rawRecord: { id: 'raw' } },
    };
    const state = { collapsedColumns: Array(10).fill(false) };
    const cell = helpers.createTransactionCell(
      { label: 'Amount', getValue: row => row.amount },
      transaction,
      { collapsed: false, dom }
    );
    expect(cell.textContent).toBe('4');
    const collapsed = helpers.createTransactionCell(
      { label: 'Amount', getValue: row => row.amount },
      transaction,
      { collapsed: true, dom }
    );
    expect(collapsed.textContent).toBe('');
    expect(collapsed.tag).toBe('td');
    const link = helpers.createColumnToggleLink(dom, 'toggle', () => {});
    expect(link.href).toBe('#');
    let clicked = false;
    const activeLink = helpers.createColumnToggleLink(dom, 'active', () => {
      clicked = true;
    });
    click(activeLink);
    expect(clicked).toBe(true);
    expect(state.collapsedColumns).toHaveLength(10);

    let rerenders = 0;
    const expandedHeader = helpers.createTableHeaderCell(
      { start: 0, length: 1, collapsed: false },
      {
        collapsedColumns: state.collapsedColumns,
        rerender: () => {
          rerenders += 1;
        },
        dom,
      }
    );
    expect(expandedHeader.className).toContain('--expanded');
    expect(expandedHeader.tag).toBe('th');
    expect(expandedHeader.colSpan).toBe(1);
    expect(expandedHeader.children[0].textContent).toBe('Transaction ID');
    expect(expandedHeader.children[0].tag).toBe('span');
    expect(expandedHeader.children[1].textContent).toBe('(-)');
    click(expandedHeader.children[1]);
    expect(rerenders).toBe(1);
    const collapsedHeader = helpers.createTableHeaderCell(
      { start: 0, length: 2, collapsed: true },
      {
        collapsedColumns: state.collapsedColumns,
        rerender: () => {
          rerenders += 1;
        },
        dom,
      }
    );
    expect(collapsedHeader.className).toContain('--collapsed');
    expect(collapsedHeader.tag).toBe('th');
    expect(collapsedHeader.colSpan).toBe(2);
    expect(collapsedHeader.children[0].textContent).toBe('(+)');
    click(collapsedHeader.children[0]);
    expect(rerenders).toBe(2);
    const tableHead = helpers.createTableHead(
      { collapsedColumns: Array(10).fill(false) },
      () => {},
      dom
    );
    expect(tableHead.tag).toBe('thead');
    expect(tableHead.className).toBe('ledger-ingest-transactions-head');
    expect(tableHead.children[0].tag).toBe('tr');
    expect(tableHead.style.verticalAlign).toBe('top');
    const tableBody = helpers.createTableBody([transaction], state, dom);
    expect(tableBody.tag).toBe('tbody');
    expect(tableBody.className).toBe('ledger-ingest-transactions-body');
    expect(tableBody.children[0].tag).toBe('tr');
    expect(tableBody.children[0].className).toBe(
      'ledger-ingest-transactions-row'
    );
    const jsonSection = helpers.createJsonSection(dom, {
      title: 'Details',
      value: { ok: true },
      className: 'ledger-ingest-section--details',
    });
    expect(jsonSection.children[0].textContent).toBe('Details');
    expect(jsonSection.children[1].tag).toBe('pre');
    expect(jsonSection.children[1].className).toBe(
      'ledger-ingest-section-body'
    );
  });
});
/* eslint max-lines-per-function: off, max-statements: off */
