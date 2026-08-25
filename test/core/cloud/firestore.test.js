import { jest } from '@jest/globals';
import { createFirestoreModule } from '../../../src/core/cloud/firestore.js';

describe('createFirestoreModule', () => {
  /** @returns {object} Firestore test fixture. */
  function createFixture() {
    const initializeApp = jest.fn(() => ({ app: true }));
    const ensureFirebaseApp = jest.fn();
    const resetFirebaseInitializationState = jest.fn();
    const createFirebaseAppManager = jest.fn(() => ({
      ensureFirebaseApp,
      resetFirebaseInitializationState,
    }));
    const getFirestore = jest.fn((app, databaseId) => ({ app, databaseId }));
    const module = createFirestoreModule({
      initializeApp,
      getFirestore,
      createFirebaseAppManager,
    });
    return {
      module,
      ensureFirebaseApp,
      resetFirebaseInitializationState,
      getFirestore,
    };
  }

  it('caches the default Firestore instance and exposes the resolver', () => {
    const { module, ensureFirebaseApp, getFirestore } = createFixture();
    const previousDatabaseId = process.env.DATABASE_ID;
    process.env.DATABASE_ID = 'default-db';

    expect(module.resolveFirestoreDatabaseId(process.env)).toBe('default-db');
    const first = module.getFirestoreInstance();
    const second = module.getFirestoreInstance();

    expect(first).toBe(second);
    expect(getFirestore).toHaveBeenCalledTimes(1);
    expect(getFirestore).toHaveBeenCalledWith(undefined, 'default-db');
    expect(ensureFirebaseApp).toHaveBeenCalledTimes(2);
    if (previousDatabaseId === undefined) delete process.env.DATABASE_ID;
    else process.env.DATABASE_ID = previousDatabaseId;
  });

  it('bypasses the cache when injected dependencies or environment differ', () => {
    const { module, getFirestore } = createFixture();
    const environment = { DENDRITE_ENVIRONMENT: 't-test' };
    const customEnsure = jest.fn();
    const customGetFirestore = jest.fn(() => 'custom');

    expect(
      module.getFirestoreInstance({
        ensureAppFn: customEnsure,
        getFirestoreFn: customGetFirestore,
        environment,
      })
    ).toBe('custom');
    expect(customEnsure).toHaveBeenCalledTimes(1);
    expect(customGetFirestore).toHaveBeenCalledWith(undefined, 't-test');
    expect(getFirestore).not.toHaveBeenCalled();
  });

  it('bypasses independently for each cache identity component', () => {
    const first = createFixture();
    const customEnsure = jest.fn();
    const previousDatabaseId = process.env.DATABASE_ID;
    process.env.DATABASE_ID = 't-test';
    expect(
      first.module.getFirestoreInstance({ ensureAppFn: customEnsure })
    ).toEqual({ app: undefined, databaseId: 't-test' });
    first.module.getFirestoreInstance({ ensureAppFn: customEnsure });
    expect(first.getFirestore).toHaveBeenCalledWith(undefined, 't-test');
    expect(first.getFirestore).toHaveBeenCalledTimes(2);

    const second = createFixture();
    const customGetFirestore = jest.fn(() => 'custom-get');
    expect(
      second.module.getFirestoreInstance({ getFirestoreFn: customGetFirestore })
    ).toBe('custom-get');
    second.module.getFirestoreInstance({ getFirestoreFn: customGetFirestore });
    expect(customGetFirestore).toHaveBeenCalledTimes(2);
    expect(second.getFirestore).not.toHaveBeenCalled();

    const third = createFixture();
    const customEnvironment = { DATABASE_ID: 'isolated-db' };
    expect(
      third.module.getFirestoreInstance({ environment: customEnvironment })
    ).toEqual({ app: undefined, databaseId: 'isolated-db' });
    third.module.getFirestoreInstance({ environment: customEnvironment });
    expect(third.getFirestore).toHaveBeenCalledWith(undefined, 'isolated-db');
    expect(third.getFirestore).toHaveBeenCalledTimes(2);
    if (previousDatabaseId === undefined) delete process.env.DATABASE_ID;
    else process.env.DATABASE_ID = previousDatabaseId;
  });

  it('clears the cache and resets Firebase initialization state', () => {
    const { module, resetFirebaseInitializationState, getFirestore } =
      createFixture();
    const environment = { DATABASE_ID: 'cache-db' };

    module.getFirestoreInstance({ environment });
    module.clearFirestoreInstanceCache();
    module.getFirestoreInstance({ environment });

    expect(getFirestore).toHaveBeenCalledTimes(2);
    expect(resetFirebaseInitializationState).toHaveBeenCalledTimes(1);
  });
});
