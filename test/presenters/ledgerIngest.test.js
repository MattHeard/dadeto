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

  test('renders a summary view for ledger ingest output', () => {
    const dom = createMockDom();
    const payload = {
      fixture: 'jsonImport',
      inputMode: 'json',
      canonicalTransactions: [
        {
          transactionId: 'tx-1',
          amount: 12,
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
    expect(canonical.children[1].textContent).toContain(
      '"transactionId": "tx-1"'
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

  test('covers helper fallbacks for missing summary data', () => {
    expect(ledgerIngestReportTestOnly.formatJson(undefined)).toBe('null');
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
