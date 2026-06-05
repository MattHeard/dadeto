import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import {
  clearFirestoreInstanceCache,
  getFirestoreInstance,
  resolveFirestoreDatabaseId,
} from '../../src/cloud/firestore.js';
import { getFirestoreForDatabase } from '../../src/core/cloud/firestore-helpers.js';

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

  test('passes the named database as the second admin firestore argument', () => {
    const expectedDb = { name: 'db' };
    const getFirestoreFn = jest.fn(() => expectedDb);

    const db = getFirestoreForDatabase(getFirestoreFn, undefined, 'custom-db');

    expect(getFirestoreFn).toHaveBeenCalledWith(undefined, 'custom-db');
    expect(db).toBe(expectedDb);
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

  test('bypasses the cache when custom dependencies are supplied', () => {
    const ensureAppFn = jest.fn();
    const getFirestoreFn = jest.fn(() => ({}));
    const environment = {
      FIREBASE_CONFIG: JSON.stringify({ databaseId: 'custom-db' }),
    };

    getFirestoreInstance({
      ensureAppFn,
      getFirestoreFn,
      environment,
    });

    getFirestoreInstance({
      ensureAppFn: () => {},
      getFirestoreFn,
      environment,
    });

    expect(getFirestoreFn).toHaveBeenCalledTimes(2);
  });

  test('reuses the cached Firestore instance for default dependencies', () => {
    const firstDb = getFirestoreInstance();
    const secondDb = getFirestoreInstance();

    expect(secondDb).toBe(firstDb);
  });
});
