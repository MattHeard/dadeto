import { jest } from '@jest/globals';
import {
  createDefaultFirestoreContextChecker,
  createFirestoreInstance,
  getFirestoreInstanceFromCache,
  getFirestoreForDatabase,
  resolveFirestoreDatabaseId,
} from '../../../src/core/cloud/firestore-helpers.js';

describe('firestore helpers', () => {
  it('checks the caller Firestore context by dependency identity', () => {
    const ensureAppFn = jest.fn();
    const getFirestoreFn = jest.fn();
    const environment = { DENDRITE_ENVIRONMENT: 'production' };
    const isDefaultContext = createDefaultFirestoreContextChecker(
      ensureAppFn,
      getFirestoreFn,
      environment
    );

    expect(isDefaultContext({ ensureAppFn, getFirestoreFn, environment })).toBe(
      true
    );
    expect(
      isDefaultContext({
        ensureAppFn,
        getFirestoreFn,
        environment: { ...environment },
      })
    ).toBe(false);
    expect(
      isDefaultContext({
        ensureAppFn: jest.fn(),
        getFirestoreFn,
        environment,
      })
    ).toBe(false);
  });

  describe('resolveFirestoreDatabaseId', () => {
    it('prefers a non-empty explicit database id', () => {
      expect(
        resolveFirestoreDatabaseId({
          DATABASE_ID: 'custom-db',
          DENDRITE_ENVIRONMENT: 't-preview',
        })
      ).toBe('custom-db');
    });

    it('uses a t-* deployment environment when no explicit id exists', () => {
      expect(
        resolveFirestoreDatabaseId({ DENDRITE_ENVIRONMENT: 't-preview' })
      ).toBe('t-preview');
    });

    it.each([
      {},
      { DATABASE_ID: '   ' },
      { DATABASE_ID: 42 },
      { DENDRITE_ENVIRONMENT: 'production' },
    ])('rejects an unconfigured environment (%o)', environment => {
      expect(() => resolveFirestoreDatabaseId(environment)).toThrow(
        'Firestore database id is required'
      );
    });
  });

  it('selects a named database with or without an app', () => {
    const firestoreFactory = jest.fn((app, id) => ({ app, id }));
    const app = { name: 'app' };

    expect(getFirestoreForDatabase(firestoreFactory, app, 'named')).toEqual({
      app,
      id: 'named',
    });
    expect(getFirestoreForDatabase(firestoreFactory, null, 'named')).toEqual({
      app: undefined,
      id: 'named',
    });
  });

  it('uses the default database path for default or missing ids', () => {
    const firestoreFactory = jest.fn((app, id) => ({ app, id }));
    const app = { name: 'app' };

    expect(getFirestoreForDatabase(firestoreFactory, app, '(default)')).toEqual(
      {
        app,
        id: undefined,
      }
    );
    expect(getFirestoreForDatabase(firestoreFactory, app, null)).toEqual({
      app,
      id: undefined,
    });
  });

  it('creates an instance through the named database path', () => {
    const firestoreFactory = jest.fn(() => 'firestore');
    expect(createFirestoreInstance(firestoreFactory, 'created-db')).toBe(
      'firestore'
    );
    expect(firestoreFactory).toHaveBeenCalledWith(undefined, 'created-db');
  });

  it('caches the default instance and creates fresh injected instances', () => {
    const cache = { value: null };
    const ensureAppFn = jest.fn();
    const getFirestoreFn = jest.fn(() => ({ id: 'firestore' }));
    const options = {
      cache,
      ensureAppFn,
      getFirestoreFn,
      environment: { DATABASE_ID: 'named-db' },
      shouldCache: () => true,
    };

    const first = getFirestoreInstanceFromCache(options);
    const second = getFirestoreInstanceFromCache(options);
    const injected = getFirestoreInstanceFromCache({
      ...options,
      shouldCache: () => false,
    });

    expect(first).toBe(second);
    expect(injected).not.toBe(first);
    expect(getFirestoreFn).toHaveBeenCalledTimes(2);
    expect(ensureAppFn).toHaveBeenCalledTimes(3);
    expect(cache.value).toBe(first);
  });

  it('recreates the instance after the shared cache is cleared', () => {
    const cache = { value: null };
    const options = {
      cache,
      ensureAppFn: jest.fn(),
      getFirestoreFn: jest.fn(() => ({})),
      environment: { DATABASE_ID: 'named-db' },
      shouldCache: () => true,
    };

    const first = getFirestoreInstanceFromCache(options);
    cache.value = null;
    const second = getFirestoreInstanceFromCache(options);

    expect(second).not.toBe(first);
    expect(options.getFirestoreFn).toHaveBeenCalledTimes(2);
  });
});
