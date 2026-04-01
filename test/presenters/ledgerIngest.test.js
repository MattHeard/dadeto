import { describe, expect, test } from '@jest/globals';
import {
  createLedgerIngestReportElement,
  ledgerIngestReportTestOnly,
} from '../../src/core/browser/presenters/ledgerIngest.js';

/**
 * Build a minimal DOM facade for presenter tests.
 * @returns {{ createElement: (tag: string) => { tag: string, className: string, textContent: string, children: unknown[] }, setClassName: (node: { className: string }, className: string) => void, setTextContent: (node: { textContent: string }, text: string) => void, appendChild: (parent: { children: unknown[] }, child: unknown) => void }} DOM mock.
 */
function createMockDom() {
  return {
    createElement: tag => ({
      tag,
      className: '',
      textContent: '',
      children: [],
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
  };
}

describe('createLedgerIngestReportElement', () => {
  test('returns a fallback pre element when JSON is invalid', () => {
    const dom = createMockDom();
    const input = 'not json';

    const result = createLedgerIngestReportElement(input, dom);

    expect(result.tag).toBe('pre');
    expect(result.textContent).toBe(input);
  });

  test('renders canonical transactions as a table with collapsible details', () => {
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
    expect(canonical.children[1].tag).toBe('table');
    expect(canonical.children[1].className).toBe(
      'ledger-ingest-transactions-table'
    );
    const [thead, tbody] = canonical.children[1].children;
    expect(thead.children[0].children.map(cell => cell.textContent)).toEqual([
      'Transaction ID',
      'Posted date',
      'Amount',
      'Currency',
      'Description',
      'Columns',
    ]);
    const row = tbody.children[0];
    expect(row.children[0].textContent).toBe(
      'ember-bank-us:2026-03-01|12|coffee shop:0'
    );
    expect(row.children[1].textContent).toBe('2026-03-01');
    expect(row.children[2].textContent).toBe('12');
    expect(row.children[3].textContent).toBe('USD');
    expect(row.children[4].textContent).toBe('coffee shop');
    const details = row.children[5].children[0];
    const detailsTable = details.children[1];
    const detailsBody = detailsTable.children[0];
    const detailsFirstRow = detailsBody.children[0];

    expect(details.className).toBe('ledger-ingest-transactions-details');
    expect(details.children[0].textContent).toBe('Show 5 columns');
    expect(detailsFirstRow.children[0].textContent).toBe('Dedupe key');
    expect(detailsFirstRow.children[1].textContent).toBe(
      '2026-03-01|12|coffee shop'
    );
    expect(detailsBody.children[3].children[1].textContent).toBe('—');
    expect(detailsBody.children[4].children[1].textContent).toContain(
      '"id": "row-1"'
    );
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
  });
});
