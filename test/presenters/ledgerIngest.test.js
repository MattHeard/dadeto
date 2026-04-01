import { describe, expect, test } from '@jest/globals';
import {
  createLedgerIngestReportElement,
  ledgerIngestReportTestOnly,
} from '../../src/core/browser/presenters/ledgerIngest.js';

/**
 * Build a minimal DOM facade for presenter tests.
 * @returns {{ createElement: (tag: string) => { tag: string, className: string, textContent: string, children: unknown[], colSpan: number, type: string, listeners: Record<string, (event: { preventDefault: () => void }) => void> }, setClassName: (node: { className: string }, className: string) => void, setTextContent: (node: { textContent: string }, text: string) => void, appendChild: (parent: { children: unknown[] }, child: unknown) => void, setType: (node: { type: string }, type: string) => void, addEventListener: (node: { listeners: Record<string, (event: { preventDefault: () => void }) => void> }, event: string, handler: (event: { preventDefault: () => void }) => void) => void, removeAllChildren: (node: { children: unknown[] }) => void }} DOM mock.
 */
function createMockDom() {
  return {
    createElement: tag => ({
      tag,
      className: '',
      textContent: '',
      children: [],
      colSpan: 1,
      type: '',
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
    setType: (node, type) => {
      node.type = type;
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
    const tableHost = canonical.children[1];
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
    expect(canonical.children[0].textContent).toBe('Canonical transactions');
    expect(tableHost.className).toBe('ledger-ingest-transactions-table-host');
    expect(getTable().tag).toBe('table');
    expect(getTable().className).toBe('ledger-ingest-transactions-table');
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
    expect(getHeaderRow().children[0].children[1].textContent).toBe('(-)');
    const row = getBodyRow();
    expect(row.children[0].textContent).toBe(
      'ember-bank-us:2026-03-01|12|coffee shop:0'
    );
    expect(row.children[1].textContent).toBe('2026-03-01');
    expect(row.children[2].textContent).toBe('12');
    expect(row.children[3].textContent).toBe('USD');
    expect(row.children[4].textContent).toBe('coffee shop');
    expect(row.children[5].textContent).toBe('2026-03-01|12|coffee shop');
    expect(row.children[6].textContent).toBe('ember-bank-us');
    expect(row.children[7].textContent).toBe('0');
    expect(row.children[8].textContent).toBe('—');
    expect(row.children[9].textContent).toContain('"id": "row-1"');

    click(getHeaderRow().children[0].children[1]);

    expect(getHeaderRow().children[0].colSpan).toBe(1);
    expect(getHeaderRow().children[0].children.length).toBe(1);
    expect(getHeaderRow().children[0].children[0].textContent).toBe('(+)');
    expect(getBodyRow().children[0].textContent).toBe('');
    expect(getBodyRow().children[1].textContent).toBe('2026-03-01');

    click(getHeaderRow().children[1].children[1]);

    expect(getHeaderRow().children[0].colSpan).toBe(2);
    expect(getHeaderRow().children[0].children.length).toBe(1);
    expect(getHeaderRow().children[0].children[0].textContent).toBe('(+)');
    expect(getBodyRow().children[0].textContent).toBe('');
    expect(getBodyRow().children[1].textContent).toBe('');

    click(getHeaderRow().children[0].children[0]);

    expect(getHeaderRow().children[0].colSpan).toBe(1);
    expect(getHeaderRow().children[0].children[0].textContent).toBe(
      'Transaction ID'
    );
    expect(getHeaderRow().children[0].children[1].textContent).toBe('(-)');
    expect(getHeaderRow().children[1].children[0].textContent).toBe(
      'Posted date'
    );
    expect(getHeaderRow().children[1].children[1].textContent).toBe('(-)');
    expect(getBodyRow().children[0].textContent).toBe(
      'ember-bank-us:2026-03-01|12|coffee shop:0'
    );
    expect(getBodyRow().children[1].textContent).toBe('2026-03-01');

    expect(duplicates.children[0].textContent).toBe('Duplicate reports');
    expect(errors.children[0].textContent).toBe('Error reports');
    expect(summary.children[0].textContent).toBe('Summary');
    expect(summary.children[1].textContent).toContain('"rawRecords": 3');
    expect(policy.children[0].textContent).toBe('Policy');
    expect(policy.children[1].textContent).toContain(
      '"name": "posted-date-amount-description"'
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
  });
});
