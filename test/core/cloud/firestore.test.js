import { jest } from '@jest/globals';
import { createFirestoreModule } from '../../../src/core/cloud/firestore.js';

describe('createFirestoreModule', () => {
  /**
   *
   */
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
