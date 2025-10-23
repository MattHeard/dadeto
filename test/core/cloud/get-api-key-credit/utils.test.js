import { describe, expect, it, jest } from '@jest/globals';
import { createFirestore } from '../../../../src/core/cloud/get-api-key-credit/createFirestore.js';
import {
  fetchApiKeyCreditDocument,
  isMissingDocument,
} from '../../../../src/core/cloud/get-api-key-credit/core.js';

describe('createFirestore', () => {
  it('instantiates the provided constructor without arguments', () => {
    const Constructor = jest.fn(function FakeFirestore() {
      this.created = true;
    });

    const instance = createFirestore(Constructor);

    expect(Constructor).toHaveBeenCalledTimes(1);
    expect(Constructor).toHaveBeenCalledWith();
    expect(instance).toBe(Constructor.mock.instances[0]);
    expect(instance.created).toBe(true);
  });
});

describe('fetchApiKeyCreditDocument', () => {
  it('requests the api-key-credit document using the coerced UUID', async () => {
    const get = jest.fn().mockResolvedValue('document');
    const doc = jest.fn().mockReturnValue({ get });
    const collection = jest.fn().mockReturnValue({ doc });
    const firestoreInstance = { collection };

    const promise = fetchApiKeyCreditDocument(firestoreInstance, 321);

    expect(collection).toHaveBeenCalledWith('api-key-credit');
    expect(doc).toHaveBeenCalledWith('321');
    await expect(promise).resolves.toBe('document');
  });
});

describe('isMissingDocument', () => {
  it('returns true when the snapshot is missing', () => {
    expect(isMissingDocument({ exists: false })).toBe(true);
    expect(isMissingDocument({})).toBe(true);
    expect(isMissingDocument()).toBe(true);
  });

  it('returns false when the snapshot exists', () => {
    expect(isMissingDocument({ exists: true })).toBe(false);
  });
});
