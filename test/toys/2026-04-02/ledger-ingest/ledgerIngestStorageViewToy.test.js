import { describe, expect, it, jest } from '@jest/globals';
import { ledgerIngestStorageViewToy } from '../../../../src/core/browser/toys/2026-04-02/ledger-ingest/ledgerIngestStorageViewToy.js';
import { ledgerIngestStorageCoreTestOnly } from '../../../../src/core/browser/toys/2026-03-13/ledger-ingest/ledgerIngestStorageCore.js';

/**
 * Build a toy environment with permanent storage data.
 * @param {unknown} stored Stored permanent data fixture.
 * @returns {Map<string, unknown>} Toy runtime environment.
 */
function createEnv(stored) {
  return new Map([['getLocalPermanentData', jest.fn(() => stored)]]);
}

describe('ledgerIngestStorageViewToy', () => {
  it('renders the stored LEDG3 transactions as a ledger-ingest report', () => {
    const transaction = {
      transactionId: 'tx-1',
      dedupeKey: 'dedupe-1',
      source: 'manual',
      postedDate: '2026-04-01',
      amount: 10,
      currency: 'USD',
      description: 'Coffee',
      rawIndex: 0,
      sourceRecordId: 'source-1',
      metadata: {
        rawRecord: {
          id: 'source-1',
        },
      },
    };
    const env = createEnv({
      LEDG3: {
        transactionOrder: ['dedupe-1'],
        transactionsByMergeKey: {
          'dedupe-1': transaction,
        },
      },
    });

    const result = JSON.parse(ledgerIngestStorageViewToy('', env));

    expect(result.fixture).toBe('LEDG3');
    expect(result.inputMode).toBe('storage');
    expect(result.canonicalTransactions).toEqual([transaction]);
    expect(result.summary).toEqual({
      rawRecords: 1,
      canonicalTransactions: 1,
      duplicatesDetected: 0,
      errorsDetected: 0,
    });
    expect(result.policy).toEqual({
      storageKey: 'LEDG3',
      mode: 'read-only',
    });
    expect(env.get('getLocalPermanentData')).toHaveBeenCalledTimes(1);
  });

  it('honors an override storage key and falls back to an empty report', () => {
    const env = createEnv({
      LEDG3: {
        transactionOrder: ['dedupe-1'],
        transactionsByMergeKey: {},
      },
    });

    const result = JSON.parse(
      ledgerIngestStorageViewToy('{"storageKey":"LEDG9"}', env)
    );

    expect(result.canonicalTransactions).toEqual([]);
    expect(result.summary.rawRecords).toBe(0);
    expect(
      ledgerIngestStorageCoreTestOnly.resolveStorageKey({
        storageKey: 'LEDG9',
      })
    ).toBe('LEDG9');
  });
});
