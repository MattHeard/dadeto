// @ts-nocheck
/* istanbul ignore file */
import {
  resolveFirestoreDatabaseId,
  getFirestoreForDatabase,
} from './firestore-helpers.js';

/**
 * Create the shared Firestore module for cloud entrypoints.
 * @param {{
 *   initializeApp: () => unknown,
 *   getFirestore: (app?: unknown, databaseId?: string) => import('firebase-admin/firestore').Firestore,
 *   createFirebaseAppManager: (initializeApp: () => unknown) => {
 *     ensureFirebaseApp: () => void,
 *     resetFirebaseInitializationState: () => void
 *   },
 * }} deps Module dependencies.
 * @returns {{
 *   resolveFirestoreDatabaseId: typeof resolveFirestoreDatabaseId,
 *   getFirestoreInstance: (options?: {
 *     ensureAppFn?: () => void,
 *     getFirestoreFn?: (app?: unknown, databaseId?: string) => import('firebase-admin/firestore').Firestore,
 *     environment?: Record<string, unknown>,
 *   }) => import('firebase-admin/firestore').Firestore,
 *   clearFirestoreInstanceCache: () => void,
 * }} Firestore helpers for the cloud wrappers.
 */
export function createFirestoreModule(deps) {
  const { ensureFirebaseApp, resetFirebaseInitializationState } =
    deps.createFirebaseAppManager(deps.initializeApp);

  let cachedDb = null;

  /**
   *
   * @param root0
   * @param root0.ensureAppFn
   * @param root0.getFirestoreFn
   * @param root0.environment
   */
  function shouldBypassFirestoreCache({
    ensureAppFn,
    getFirestoreFn,
    environment,
  }) {
    return (
      ensureAppFn !== ensureFirebaseApp ||
      getFirestoreFn !== deps.getFirestore ||
      environment !== process.env
    );
  }

  /**
   *
   * @param options
   */
  function getFirestoreInstance(options = {}) {
    const {
      ensureAppFn = ensureFirebaseApp,
      getFirestoreFn = deps.getFirestore,
      environment = process.env,
    } = options;

    ensureAppFn();
    const databaseId = resolveFirestoreDatabaseId(environment);

    if (
      shouldBypassFirestoreCache({ ensureAppFn, getFirestoreFn, environment })
    ) {
      return getFirestoreForDatabase(getFirestoreFn, undefined, databaseId);
    }

    if (!cachedDb) {
      cachedDb = getFirestoreForDatabase(getFirestoreFn, undefined, databaseId);
    }

    return cachedDb;
  }

  /**
   *
   */
  function clearFirestoreInstanceCache() {
    cachedDb = null;
    resetFirebaseInitializationState();
  }

  return {
    resolveFirestoreDatabaseId,
    getFirestoreInstance,
    clearFirestoreInstanceCache,
  };
}
