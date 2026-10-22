import { describe, expect, it, jest } from '@jest/globals';
import {
  createGcpTestAuthorUuidBillingSeed,
  GCP_TEST_AUTHOR_UUID_UID,
  seedGcpTestAuthorUuidBillingCredit,
} from '../../../../src/core/cloud/get-author-uuid-v2/gcp-test-billing-seed-core.js';

const allowEffects = Object.freeze({ test: true });
const seedInput = {
  environment: 't-abcdef12',
  databaseId: 't-abcdef12',
  workflowRunId: '987654321',
  createdAt: new Date('2026-10-20T00:00:00.000Z'),
};

/**
 * Create an in-memory transaction store for seed tests.
 * @param {Record<string, Record<string, unknown>>} [initialDocuments] Initial document values.
 * @returns {Record<string, any>} Fake store and observable document map.
 */
function createStore(initialDocuments = {}) {
  const documents = new Map(Object.entries(initialDocuments));
  const transaction = Object.freeze({ transaction: true });
  return {
    documents,
    transaction,
    runTransaction: jest.fn(async (_permission, handler) =>
      handler(transaction)
    ),
    getDocument: jest.fn(async (_permission, _transaction, path) => {
      return documents.get(path) ?? null;
    }),
    createDocument: jest.fn(async (_permission, _transaction, path, data) => {
      if (documents.has(path)) throw new Error('Document already exists.');
      documents.set(path, data);
    }),
  };
}

describe('gcp-test author UUID billing seed', () => {
  it('builds a single non-purchased credit and one-credit operation price', () => {
    const { documents } = createGcpTestAuthorUuidBillingSeed(seedInput);
    const ownership = documents.find(document =>
      document.path.startsWith('api-key-ownership/')
    );
    const lot = documents.find(document => document.path.includes('/lots/'));
    const pricing = documents.find(document =>
      document.path.startsWith('billing-pricing-snapshots/')
    );

    expect(GCP_TEST_AUTHOR_UUID_UID).toBe('dadeto-gcp-test-get-author-uuid-v2');
    expect(ownership?.data).toMatchObject({
      environment: seedInput.environment,
      testUid: GCP_TEST_AUTHOR_UUID_UID,
      workflowRunId: seedInput.workflowRunId,
    });
    expect(lot?.data).toMatchObject({
      issuedCredits: 1,
      remainingCredits: 1,
      refundable: false,
      creditSource: 'non-purchased-test-credit',
      environment: seedInput.environment,
      testUid: GCP_TEST_AUTHOR_UUID_UID,
    });
    expect(pricing?.data).toMatchObject({
      operations: { 'get-author-uuid-v2': { costEurMicros: 1 } },
      creditEurMicros: 1,
    });
    expect(documents).toHaveLength(4);
    expect(
      documents.some(document => document.path.startsWith('billing-purchases/'))
    ).toBe(false);
  });

  it('creates a timestamp when the caller leaves it unspecified', () => {
    const { documents } = createGcpTestAuthorUuidBillingSeed({
      environment: seedInput.environment,
      databaseId: seedInput.databaseId,
      workflowRunId: seedInput.workflowRunId,
    });
    const lot = documents.find(document => document.path.includes('/lots/'));

    expect(lot?.data.createdAt).toBeInstanceOf(Date);
  });

  it('rejects production or mismatched database identities', () => {
    expect(() =>
      createGcpTestAuthorUuidBillingSeed({
        ...seedInput,
        environment: 'production',
        databaseId: 'production',
      })
    ).toThrow('temporary t-* database');
    expect(() =>
      createGcpTestAuthorUuidBillingSeed({
        ...seedInput,
        databaseId: '(default)',
      })
    ).toThrow('temporary t-* database');
  });

  it('requires a workflow id and a valid creation time', () => {
    expect(() =>
      createGcpTestAuthorUuidBillingSeed({ ...seedInput, workflowRunId: ' ' })
    ).toThrow('workflow run identifier');
    expect(() =>
      createGcpTestAuthorUuidBillingSeed({
        ...seedInput,
        createdAt: new Date('invalid'),
      })
    ).toThrow('valid creation time');
  });

  it('creates all seed documents atomically and forwards the effect token', async () => {
    const store = createStore();

    await expect(
      seedGcpTestAuthorUuidBillingCredit(allowEffects, seedInput, store)
    ).resolves.toEqual({ createdDocuments: 4, unchangedDocuments: 0 });

    expect(store.runTransaction).toHaveBeenCalledWith(
      allowEffects,
      expect.any(Function)
    );
    expect(store.getDocument).toHaveBeenCalledTimes(4);
    expect(store.createDocument).toHaveBeenCalledTimes(4);
    expect(store.createDocument).toHaveBeenCalledWith(
      allowEffects,
      store.transaction,
      expect.stringContaining('/lots/'),
      expect.objectContaining({ remainingCredits: 1 })
    );
  });

  it('does not restore consumed test credit when the seed is repeated', async () => {
    const store = createStore();
    await seedGcpTestAuthorUuidBillingCredit(allowEffects, seedInput, store);
    const balancePath = [...store.documents.keys()].find(path =>
      /^api-key-credit\/[^/]+$/.test(path)
    );
    const lotPath = [...store.documents.keys()].find(path =>
      path.includes('/lots/')
    );
    store.documents.set(balancePath, { credit: 0, lastEventId: 'settled' });
    store.documents.set(lotPath, {
      ...store.documents.get(lotPath),
      remainingCredits: 0,
    });
    const repeatedInput = {
      ...seedInput,
      createdAt: new Date('2026-10-21T00:00:00.000Z'),
    };

    await expect(
      seedGcpTestAuthorUuidBillingCredit(allowEffects, repeatedInput, store)
    ).resolves.toEqual({ createdDocuments: 0, unchangedDocuments: 4 });

    expect(store.createDocument).toHaveBeenCalledTimes(4);
    expect(store.documents.get(balancePath)).toMatchObject({ credit: 0 });
    expect(store.documents.get(lotPath)).toMatchObject({ remainingCredits: 0 });
  });

  it('rejects invalid existing balances, lot values, and missing provenance time', async () => {
    const seed = createGcpTestAuthorUuidBillingSeed(seedInput);
    const store = createStore();
    await seedGcpTestAuthorUuidBillingCredit(allowEffects, seedInput, store);
    const balancePath = [...store.documents.keys()].find(path =>
      /^api-key-credit\/[^/]+$/.test(path)
    );
    const lotPath = [...store.documents.keys()].find(path =>
      path.includes('/lots/')
    );

    store.documents.set(balancePath, { credit: 2 });
    await expect(
      seedGcpTestAuthorUuidBillingCredit(allowEffects, seedInput, store)
    ).rejects.toThrow('balance does not match');
    store.documents.set(balancePath, { credit: 1 });
    store.documents.set(lotPath, {
      ...store.documents.get(lotPath),
      remainingCredits: 2,
    });
    await expect(
      seedGcpTestAuthorUuidBillingCredit(allowEffects, seedInput, store)
    ).rejects.toThrow('lot does not match');
    store.documents.set(lotPath, {
      ...seed.documents.find(document => document.path === lotPath)?.data,
      createdAt: null,
    });
    await expect(
      seedGcpTestAuthorUuidBillingCredit(allowEffects, seedInput, store)
    ).rejects.toThrow('missing its creation time');
  });

  it('rejects partial seeds and conflicting provenance without creating writes', async () => {
    const seed = createGcpTestAuthorUuidBillingSeed(seedInput);
    const partialStore = createStore({
      [seed.documents[0].path]: seed.documents[0].data,
    });
    await expect(
      seedGcpTestAuthorUuidBillingCredit(allowEffects, seedInput, partialStore)
    ).rejects.toThrow('incomplete');
    expect(partialStore.createDocument).not.toHaveBeenCalled();

    const conflictingStore = createStore();
    await seedGcpTestAuthorUuidBillingCredit(
      allowEffects,
      seedInput,
      conflictingStore
    );
    conflictingStore.documents.set(seed.documents[0].path, {
      ...seed.documents[0].data,
      environment: 'other-test-database',
    });
    await expect(
      seedGcpTestAuthorUuidBillingCredit(
        allowEffects,
        seedInput,
        conflictingStore
      )
    ).rejects.toThrow('conflicting provenance');
  });
});
