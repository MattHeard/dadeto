import { describe, expect, it, jest } from '@jest/globals';
import { ledgerIngestToy } from '../../../../src/core/browser/toys/2026-03-13/ledger-ingest/ledgerIngestToy.js';
import {
  ledgerIngestStorageToy,
  ledgerIngestStorageToyTestOnly,
} from '../../../../src/core/browser/toys/2026-03-13/ledger-ingest/ledgerIngestStorageToy.js';

/**
 * Build a storage toy environment.
 * @param {{ stored?: unknown, setLocalPermanentData?: jest.Mock }} [options] Environment overrides.
 * @returns {Map<string, unknown>} Toy runtime environment.
 */
function createEnv(options = {}) {
  const entries = [];

  if (Object.prototype.hasOwnProperty.call(options, 'stored')) {
    entries.push(['getLocalPermanentData', jest.fn(() => options.stored)]);
  }

  if (Object.prototype.hasOwnProperty.call(options, 'setLocalPermanentData')) {
    entries.push(['setLocalPermanentData', options.setLocalPermanentData]);
  }

  return new Map(entries);
}

/**
 * Build a persisted root from canonical transactions.
 * @param {string} storageKey Persistent storage bucket key.
 * @param {Array<{ transactionId: string, dedupeKey: string }>} transactions Canonical rows.
 * @returns {Record<string, unknown>} Persisted root object.
 */
function createStoredRoot(storageKey, transactions) {
  const order = transactions.map(transaction =>
    ledgerIngestStorageToyTestOnly.getTransactionMergeKey(transaction)
  );

  return {
    [storageKey]: {
      transactionOrder: order,
      transactionsByMergeKey: Object.fromEntries(
        transactions.map(transaction => [
          ledgerIngestStorageToyTestOnly.getTransactionMergeKey(transaction),
          transaction,
        ])
      ),
    },
  };
}

describe('ledgerIngestStorageToy', () => {
  it('persists canonical transactions into permanent storage', () => {
    const input = JSON.stringify({ fixture: 'repeatImport' });
    const persist = jest.fn();
    const env = createEnv({
      setLocalPermanentData: persist,
    });

    const result = JSON.parse(ledgerIngestStorageToy(input, env));

    expect(result.inputMode).toBe('fixture');
    expect(result.fixture).toBe('repeatImport');
    expect(result.storage.storageKey).toBe('LEDG3');
    expect(result.storage.beforeCount).toBe(0);
    expect(result.storage.afterCount).toBe(1);
    expect(result.storage.actions).toEqual([
      {
        action: 'insert',
        mergeKey: result.canonicalTransactions[0].dedupeKey,
        transactionId: result.canonicalTransactions[0].transactionId,
      },
    ]);
    expect(result.storage.transactions).toEqual(result.canonicalTransactions);
    expect(persist).toHaveBeenCalledWith(
      createStoredRoot('LEDG3', result.canonicalTransactions)
    );
  });

  it('skips unchanged transactions when they already exist in storage', () => {
    const input = JSON.stringify({ fixture: 'repeatImport' });
    const firstRun = JSON.parse(ledgerIngestToy(input));
    const env = createEnv({
      stored: createStoredRoot('LEDG3', firstRun.canonicalTransactions),
      setLocalPermanentData: jest.fn(),
    });

    const result = JSON.parse(ledgerIngestStorageToy(input, env));

    expect(result.storage.beforeCount).toBe(1);
    expect(result.storage.afterCount).toBe(1);
    expect(result.storage.actions).toEqual([
      {
        action: 'skip',
        mergeKey: firstRun.canonicalTransactions[0].dedupeKey,
        transactionId: firstRun.canonicalTransactions[0].transactionId,
      },
    ]);
    expect(env.get('setLocalPermanentData')).toHaveBeenCalledWith(
      createStoredRoot('LEDG3', firstRun.canonicalTransactions)
    );
  });

  it('updates a stored transaction when the merge key matches but the id changes', () => {
    const input = JSON.stringify({ fixture: 'repeatImport' });
    const firstRun = JSON.parse(ledgerIngestToy(input));
    const [transaction] = firstRun.canonicalTransactions;
    const previousTransactionId = `${transaction.transactionId}-legacy`;
    const env = createEnv({
      stored: {
        LEDG3: {
          transactionOrder: [transaction.dedupeKey],
          transactionsByMergeKey: {
            [transaction.dedupeKey]: {
              ...transaction,
              transactionId: previousTransactionId,
            },
          },
        },
      },
      setLocalPermanentData: jest.fn(),
    });

    const result = JSON.parse(ledgerIngestStorageToy(input, env));

    expect(result.storage.beforeCount).toBe(1);
    expect(result.storage.afterCount).toBe(1);
    expect(result.storage.actions).toEqual([
      {
        action: 'update',
        mergeKey: transaction.dedupeKey,
        transactionId: transaction.transactionId,
        previousTransactionId,
      },
    ]);
    expect(result.storage.transactions).toEqual([transaction]);
    expect(env.get('setLocalPermanentData')).toHaveBeenCalledWith(
      createStoredRoot('LEDG3', [transaction])
    );
  });

  it('normalizes helper fallbacks and missing storage access', () => {
    expect(ledgerIngestStorageToyTestOnly.resolveStorageKey({})).toBe('LEDG3');
    expect(
      ledgerIngestStorageToyTestOnly.resolveStorageKey({
        storageKey: 'LEDG9',
      })
    ).toBe('LEDG9');
    expect(
      ledgerIngestStorageToyTestOnly.readPermanentStorageRoot(new Map())
    ).toEqual({});
    expect(
      ledgerIngestStorageToyTestOnly.readPermanentStorageRoot({
        get: () => null,
      })
    ).toEqual({});
    expect(
      ledgerIngestStorageToyTestOnly.readPermanentStorageRoot(undefined)
    ).toEqual({});
    expect(
      ledgerIngestStorageToyTestOnly.normalizeLedgerStorageState(null)
    ).toEqual({
      transactionOrder: [],
      transactionsByMergeKey: {},
    });
    expect(
      ledgerIngestStorageToyTestOnly.normalizeLedgerStorageState({
        transactionOrder: ['ok', '', 7],
        transactionsByMergeKey: {
          id: { transactionId: 'id', dedupeKey: 'id' },
        },
      })
    ).toEqual({
      transactionOrder: ['ok'],
      transactionsByMergeKey: {
        id: { transactionId: 'id', dedupeKey: 'id' },
      },
    });
    expect(
      ledgerIngestStorageToyTestOnly.normalizeTransactionOrder('nope')
    ).toEqual([]);
    expect(
      ledgerIngestStorageToyTestOnly.normalizeTransactionMap(undefined)
    ).toEqual({});
    expect(
      ledgerIngestStorageToyTestOnly.getTransactionMergeKey({
        transactionId: 'fallback-id',
      })
    ).toBe('fallback-id');
    expect(
      ledgerIngestStorageToyTestOnly.mergeLedgerStorageState(
        {
          transactionOrder: [],
          transactionsByMergeKey: {},
        },
        [
          {
            transactionId: 'new-id',
            dedupeKey: 'new-key',
          },
        ]
      )
    ).toEqual({
      nextState: {
        transactionOrder: ['new-key'],
        transactionsByMergeKey: {
          'new-key': {
            transactionId: 'new-id',
            dedupeKey: 'new-key',
          },
        },
      },
      actions: [
        {
          action: 'insert',
          mergeKey: 'new-key',
          transactionId: 'new-id',
        },
      ],
    });
    expect(
      ledgerIngestStorageToyTestOnly.persistPermanentStorageRoot(new Map(), {
        ok: true,
      })
    ).toBe(false);
    expect(
      ledgerIngestStorageToyTestOnly.persistPermanentStorageRoot(undefined, {
        ok: true,
      })
    ).toBe(false);
    expect(
      ledgerIngestStorageToyTestOnly.persistPermanentStorageRoot(
        {
          get: key => (key === 'setLocalPermanentData' ? jest.fn() : undefined),
        },
        {
          ok: true,
        }
      )
    ).toBe(true);
  });
});
