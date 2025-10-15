import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import {
  clearFirestoreInstanceCache,
  getFirestoreInstance,
  resolveFirestoreDatabaseId,
} from '../../src/cloud/firestore.js';

describe('resolveFirestoreDatabaseId', () => {
  test('returns the configured database identifier when present', () => {
    const env = {
      FIREBASE_CONFIG: JSON.stringify({ databaseId: 'test-db' }),
    };

    expect(resolveFirestoreDatabaseId(env)).toBe('test-db');
  });

  test('returns null when the config string is missing or empty', () => {
    expect(resolveFirestoreDatabaseId({})).toBeNull();
    expect(resolveFirestoreDatabaseId({ FIREBASE_CONFIG: '' })).toBeNull();
  });

  test('ignores malformed JSON and falls back to null', () => {
    const env = { FIREBASE_CONFIG: '{not-valid-json' };

    expect(resolveFirestoreDatabaseId(env)).toBeNull();
  });
});

describe('getFirestoreInstance', () => {
  beforeEach(() => {
    clearFirestoreInstanceCache();
  });

  test('creates a Firestore client for the configured database', () => {
    const expectedDb = { name: 'db' };
    const ensureAppFn = jest.fn();
    const getFirestoreFn = jest.fn(() => expectedDb);
    const environment = {
      FIREBASE_CONFIG: JSON.stringify({ databaseId: 'custom-db' }),
    };

    const db = getFirestoreInstance({
      ensureAppFn,
      getFirestoreFn,
      environment,
    });

    expect(ensureAppFn).toHaveBeenCalledTimes(1);
    expect(getFirestoreFn).toHaveBeenCalledWith(undefined, 'custom-db');
    expect(db).toBe(expectedDb);
  });

  test('defaults to the primary database when the ID is missing', () => {
    const ensureAppFn = jest.fn();
    const getFirestoreFn = jest.fn(() => ({}));

    getFirestoreInstance({
      ensureAppFn,
      getFirestoreFn,
      environment: {},
    });

    expect(ensureAppFn).toHaveBeenCalledTimes(1);
    expect(getFirestoreFn).toHaveBeenCalledWith(undefined);
  });

  test('treats the default database identifier as the primary database', () => {
    const ensureAppFn = jest.fn();
    const getFirestoreFn = jest.fn(() => ({}));

    getFirestoreInstance({
      ensureAppFn,
      getFirestoreFn,
      environment: {
        FIREBASE_CONFIG: JSON.stringify({ databaseId: '(default)' }),
      },
    });

    expect(ensureAppFn).toHaveBeenCalledTimes(1);
    expect(getFirestoreFn).toHaveBeenCalledWith(undefined);
  });
});
