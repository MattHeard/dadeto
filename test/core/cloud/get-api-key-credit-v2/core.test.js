import { describe, expect, it, jest } from '@jest/globals';
import { createFetchCredit } from '../../../../src/core/cloud/get-api-key-credit-v2/get-api-key-credit-v2-core.js';
import { getApiKeyCreditSnapshot } from '../../../../src/core/cloud/get-api-key-credit-v2/get-api-key-credit-snapshot.js';

/**
 * Create a mocked Firestore database interface that returns the provided snapshot.
 * @param {{
 *   exists: boolean,
 *   data?: () => { credit?: number } | null,
 * }} snapshot Document snapshot returned by the get call.
 * @returns {{ collection: jest.Mock, doc: jest.Mock, get: jest.Mock }} Mocked database interface.
 */
function createDatabaseMock(snapshot) {
  const get = jest.fn().mockResolvedValue(snapshot);
  const doc = jest.fn().mockReturnValue({ get });
  const collection = jest.fn().mockReturnValue({ doc });
  return { collection, doc, get };
}

describe('createFetchCredit', () => {
  it('returns null when the credit document is missing', async () => {
    const snapshot = { exists: false };
    const database = createDatabaseMock(snapshot);

    const fetchCredit = createFetchCredit(database);
    await expect(fetchCredit('uuid-123')).resolves.toBeNull();

    expect(database.collection).toHaveBeenCalledWith('api-key-credit');
    expect(database.doc).toHaveBeenCalledWith('uuid-123');
    expect(database.get).toHaveBeenCalledTimes(1);
  });

  it('returns the stored credit when the document exists', async () => {
    const snapshot = {
      exists: true,
      data: () => ({ credit: 15 }),
    };
    const database = createDatabaseMock(snapshot);

    const fetchCredit = createFetchCredit(database);
    await expect(fetchCredit('user-456')).resolves.toBe(15);

    expect(database.collection).toHaveBeenCalledWith('api-key-credit');
    expect(database.doc).toHaveBeenCalledWith('user-456');
  });

  it('defaults to zero when the credit field is missing', async () => {
    const snapshot = {
      exists: true,
      data: () => ({}),
    };
    const database = createDatabaseMock(snapshot);

    const fetchCredit = createFetchCredit(database);
    await expect(fetchCredit('user-789')).resolves.toBe(0);
  });

  it('uses an empty object when the snapshot data is nullish', async () => {
    const snapshot = {
      exists: true,
      data: () => null,
    };
    const database = createDatabaseMock(snapshot);

    const fetchCredit = createFetchCredit(database);
    await expect(fetchCredit('user-999')).resolves.toBe(0);
  });
});

describe('getApiKeyCreditSnapshot', () => {
  it('requests the document using the api-key-credit collection', async () => {
    const get = jest.fn().mockResolvedValue('snapshot');
    const doc = jest.fn().mockReturnValue({ get });
    const collection = jest.fn().mockReturnValue({ doc });
    const database = { collection };

    const promise = getApiKeyCreditSnapshot(database, 9876);

    expect(collection).toHaveBeenCalledWith('api-key-credit');
    expect(doc).toHaveBeenCalledWith('9876');
    await expect(promise).resolves.toBe('snapshot');
  });
});
