import {
  resolveFirestoreDatabaseId,
  createFirestoreInstance,
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
  const typedDeps = /** @type {any} */ (deps);
  const { ensureFirebaseApp, resetFirebaseInitializationState } =
    typedDeps.createFirebaseAppManager(typedDeps.initializeApp);

  /** @type {import('firebase-admin/firestore').Firestore | null} */
  let cachedDb = null;

  /**
   * Determine whether the current call should bypass the cached Firestore instance.
   * @param {{
   *   ensureAppFn: () => void,
   *   getFirestoreFn: typeof deps.getFirestore,
   *   environment: Record<string, unknown>,
   * }} options Firestore resolution inputs.
   * @returns {boolean} True when the call should use a fresh Firestore instance.
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
   * Resolve the shared Firestore instance for this module.
   * @param {{
   *   ensureAppFn?: () => void,
   *   getFirestoreFn?: typeof deps.getFirestore,
   *   environment?: Record<string, unknown>,
   * }} [options] Optional Firestore overrides for tests.
   * @returns {import('firebase-admin/firestore').Firestore} Firestore instance for the current environment.
   */
  function getFirestoreInstance(options = {}) {
    const {
      ensureAppFn = ensureFirebaseApp,
      getFirestoreFn = typedDeps.getFirestore,
      environment = process.env,
    } = options;

    ensureAppFn();
    const databaseId = resolveFirestoreDatabaseId(environment);

    if (
      shouldBypassFirestoreCache({ ensureAppFn, getFirestoreFn, environment })
    ) {
      return createFirestoreInstance(getFirestoreFn, databaseId);
    }

    if (!cachedDb) {
      cachedDb = createFirestoreInstance(getFirestoreFn, databaseId);
    }

    return cachedDb;
  }

  /**
   * Clear the cached Firestore instance and reset Firebase bootstrap state.
   * @returns {void}
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
