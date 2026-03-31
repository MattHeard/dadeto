import { importTransactions } from '../../../src/core/browser/toys/2026-03-13/ledger-ingest/core.js';

describe('ledger-ingest core reexport', () => {
  it('exports importTransactions', () => {
    expect(typeof importTransactions).toBe('function');
  });
});
