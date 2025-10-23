import { describe, expect, it, jest } from '@jest/globals';
import { createDb as createCloudDb } from '../../../src/cloud/get-api-key-credit-v2/create-db.js';
import { createDb as createCoreDb } from '../../../src/core/cloud/get-api-key-credit-v2/create-db.js';

describe('createDb', () => {
  it('re-exports the core implementation through the cloud entry point', () => {
    expect(createCloudDb).toBe(createCoreDb);
  });

  it('creates a Firestore instance using the provided constructor', () => {
    const instance = {};
    const FakeFirestore = jest.fn().mockImplementation(() => instance);

    const db = createCoreDb(FakeFirestore);

    expect(db).toBe(instance);
    expect(FakeFirestore).toHaveBeenCalledTimes(1);
    expect(FakeFirestore).toHaveBeenCalledWith();
  });
});
