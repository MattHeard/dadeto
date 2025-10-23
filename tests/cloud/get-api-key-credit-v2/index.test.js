import { describe, expect, it, jest } from '@jest/globals';
import { createDb } from '../../../src/cloud/get-api-key-credit-v2/create-db.js';

describe('createDb', () => {
  it('creates a Firestore instance using the provided constructor', () => {
    const instance = {};
    const FakeFirestore = jest.fn().mockImplementation(() => instance);

    const db = createDb(FakeFirestore);

    expect(db).toBe(instance);
    expect(FakeFirestore).toHaveBeenCalledTimes(1);
    expect(FakeFirestore).toHaveBeenCalledWith();
  });
});
