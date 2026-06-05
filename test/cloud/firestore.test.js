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
      DATABASE_ID: 'test-db',
    };

    expect(resolveFirestoreDatabaseId(env)).toBe('test-db');
  });

  test('prefers an explicit database id environment variable', () => {
    const env = {
      DATABASE_ID: 'runtime-db',
    };

    expect(resolveFirestoreDatabaseId(env)).toBe('runtime-db');
  });

  test('uses the t-prefixed deployment environment when no explicit database id is present', () => {
    const env = {
      DENDRITE_ENVIRONMENT: 't-019924dc',
    };

    expect(resolveFirestoreDatabaseId(env)).toBe('t-019924dc');
  });

  test('throws when the required database metadata is missing', () => {
    expect(() => resolveFirestoreDatabaseId({})).toThrow(
      'Firestore database id is required. Set DATABASE_ID or use a t-* deployment environment.'
    );
    expect(() =>
      resolveFirestoreDatabaseId({ PLAYWRIGHT_ORIGIN: 'http://playwright.test' })
    ).toThrow(
      'Firestore database id is required. Set DATABASE_ID or use a t-* deployment environment.'
    );
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
      DATABASE_ID: 'custom-db',
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

  test('prefers the explicit database id environment variable over unrelated environment data', () => {
    const ensureAppFn = jest.fn();
    const getFirestoreFn = jest.fn(() => ({}));

    getFirestoreInstance({
      ensureAppFn,
      getFirestoreFn,
      environment: {
        DATABASE_ID: 'runtime-db',
        PLAYWRIGHT_ORIGIN: 'http://playwright.test',
      },
    });

    expect(ensureAppFn).toHaveBeenCalledTimes(1);
    expect(getFirestoreFn).toHaveBeenCalledWith(undefined, 'runtime-db');
  });

  test('uses the deployment environment when DATABASE_ID is absent', () => {
    const ensureAppFn = jest.fn();
    const getFirestoreFn = jest.fn(() => ({}));

    getFirestoreInstance({
      ensureAppFn,
      getFirestoreFn,
      environment: {
        DENDRITE_ENVIRONMENT: 't-019924dc',
      },
    });

    expect(ensureAppFn).toHaveBeenCalledTimes(1);
    expect(getFirestoreFn).toHaveBeenCalledWith(undefined, 't-019924dc');
  });

  test('throws when the required database id is missing', () => {
    const ensureAppFn = jest.fn();
    const getFirestoreFn = jest.fn(() => ({}));

    expect(() =>
      getFirestoreInstance({
        ensureAppFn,
        getFirestoreFn,
        environment: {},
      })
    ).toThrow(
      'Firestore database id is required. Set DATABASE_ID or use a t-* deployment environment.'
    );
  });

  test('bypasses the cache when custom dependencies are supplied', () => {
    const ensureAppFn = jest.fn();
    const getFirestoreFn = jest.fn(() => ({}));
    const environment = {
      DATABASE_ID: 'custom-db',
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
    const originalDatabaseId = process.env.DATABASE_ID;
    process.env.DATABASE_ID = 'cached-db';

    try {
      const firstDb = getFirestoreInstance();
      const secondDb = getFirestoreInstance();

      expect(secondDb).toBe(firstDb);
    } finally {
      if (originalDatabaseId === undefined) {
        delete process.env.DATABASE_ID;
      } else {
        process.env.DATABASE_ID = originalDatabaseId;
      }
    }
  });
});
