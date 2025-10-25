import { describe, expect, it, jest } from '@jest/globals';
import { createDb as createCloudDb } from '../../../src/cloud/get-api-key-credit-v2/create-db.js';
import { createDb as createCoreDb } from '../../../src/core/cloud/get-api-key-credit-v2/create-db.js';

describe('createDb', () => {
  it('creates a Firestore instance using the provided constructor via the cloud entry point', () => {
    const instance = {};
    const FakeFirestore = jest.fn().mockImplementation(() => instance);

    const db = createCloudDb(FakeFirestore);

    expect(db).toBe(instance);
    expect(FakeFirestore).toHaveBeenCalledTimes(1);
    expect(FakeFirestore).toHaveBeenCalledWith();
  });

  it('creates a Firestore instance using the provided constructor via the core implementation', () => {
    const instance = {};
    const FakeFirestore = jest.fn().mockImplementation(() => instance);

    const db = createCoreDb(FakeFirestore);

    expect(db).toBe(instance);
    expect(FakeFirestore).toHaveBeenCalledTimes(1);
    expect(FakeFirestore).toHaveBeenCalledWith();
  });
});
