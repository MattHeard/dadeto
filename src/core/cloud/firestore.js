import {
  resolveFirestoreDatabaseId,
  createDefaultFirestoreContextChecker,
  createFirestoreInstanceCache,
  createFirestoreInstanceResolver,
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
  const typedDeps = deps;
  const { ensureFirebaseApp, resetFirebaseInitializationState } =
    typedDeps.createFirebaseAppManager(typedDeps.initializeApp);

  const firestoreCache = createFirestoreInstanceCache();
  const usesDefaultFirestoreContext = createDefaultFirestoreContextChecker(
    ensureFirebaseApp,
    deps.getFirestore,
    process.env
  );

  /**
   * Determine whether the current call should bypass the cached Firestore instance.
   * @param {{
   *   ensureAppFn: () => void,
   *   getFirestoreFn: (app?: import('firebase-admin/app').App, databaseId?: string) => import('firebase-admin/firestore').Firestore,
   *   environment: Record<string, unknown>,
   * }} options Firestore resolution inputs.
   * @returns {boolean} True when the call should use a fresh Firestore instance.
   */
  function shouldBypassFirestoreCache(options) {
    return !usesDefaultFirestoreContext(options);
  }

  const getFirestoreInstance = createFirestoreInstanceResolver({
    cache: firestoreCache,
    defaultEnsureAppFn: ensureFirebaseApp,
    defaultGetFirestoreFn: typedDeps.getFirestore,
    resolveEnvironment: options => options.environment ?? process.env,
    shouldCache: context => !shouldBypassFirestoreCache(context),
  });

  /**
   * Clear the cached Firestore instance and reset Firebase bootstrap state.
   * @returns {void}
   */
  function clearFirestoreInstanceCache() {
    firestoreCache.value = null;
    resetFirebaseInitializationState();
  }

  return {
    resolveFirestoreDatabaseId,
    getFirestoreInstance,
    clearFirestoreInstanceCache,
  };
}
