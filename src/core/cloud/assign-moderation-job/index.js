import {
  createAssignModerationJob,
  createFirebaseInitialization,
  createCorsOptions,
  configureUrlencodedBodyParser,
  createRunVariantQuery,
  setupAssignModerationJobRoute,
  resolveFirestoreEnvironment,
  shouldUseCustomFirestoreDependencies,
} from './assign-moderation-job-core.js';
import {
  getFirestoreForDatabase,
  resolveFirestoreDatabaseId,
} from '../firestore-helpers.js';
import { resolveAllowedOrigins, isDuplicateAppError } from '../cloud-core.js';

/**
 * Build the assign-moderation-job entrypoint from injected dependencies.
 * @param {Record<string, unknown>} deps Runtime dependencies supplied by the cloud wrapper.
 * @returns {{
 *   handle: unknown,
 *   testing: {
 *     firebaseInitialization: unknown,
 *     resolveFirestoreDatabaseId: typeof resolveFirestoreDatabaseId,
 *     resolveFirestoreEnvironment: typeof resolveFirestoreEnvironment,
 *     shouldUseCustomFirestoreDependencies: typeof shouldUseCustomFirestoreDependencies,
 *     getFirestoreInstance: (options?: Record<string, unknown>) => unknown,
 *     clearFirestoreInstanceCache: () => void,
 *   },
 * }} Cloud entrypoint exports and test hooks.
 */
export function createAssignModerationJobEntrypoint(deps) {
  const firebaseInitialization = createFirebaseInitialization();
  const firebaseInitializationHandlers = {
    reset: () => {
      firebaseInitialization.reset();
    },
  };

  const defaultEnsureFirebaseApp = () => {};

  /**
   * Create Firestore helpers that share a cache and a reset hook.
   * @param {{ reset: () => void }} firebaseInitializationHandlers Reset hook for the Firebase bootstrap state.
   * @returns {{
   *   getFirestoreInstance: (options?: {
   *     ensureAppFn?: () => void,
   *     getFirestoreFn?: typeof deps.getFirestore,
   *     environment?: Record<string, unknown>,
   *   }) => unknown,
   *   clearFirestoreInstanceCache: () => void,
   * }} Shared Firestore helpers.
   */
  function createFirestoreInstanceHandlers(firebaseInitializationHandlers) {
    let cachedDb = null;

    /**
     * Resolve the Firestore instance for this entrypoint.
     * @param {{
     *   ensureAppFn?: () => void,
     *   getFirestoreFn?: typeof deps.getFirestore,
     *   environment?: Record<string, unknown>,
     * }} [options] Optional Firestore overrides for tests.
     * @returns {unknown} Firestore instance for the current environment.
     */
    function getFirestoreInstance(options = {}) {
      const {
        ensureAppFn = defaultEnsureFirebaseApp,
        getFirestoreFn = deps.getFirestore,
        environment: providedEnvironment,
      } = options;

      const environment = resolveFirestoreEnvironment(
        providedEnvironment,
        deps.getEnvironmentVariables
      );

      ensureAppFn();

      const databaseId = resolveFirestoreDatabaseId(environment);
      const useCustomDependencies = shouldUseCustomFirestoreDependencies({
        options,
        defaultEnsureFn: defaultEnsureFirebaseApp,
        defaultGetFirestoreFn: deps.getFirestore,
        providedEnvironment,
      });

      if (useCustomDependencies) {
        return getFirestoreForDatabase(getFirestoreFn, undefined, databaseId);
      }

      if (!cachedDb) {
        cachedDb = getFirestoreForDatabase(
          getFirestoreFn,
          undefined,
          databaseId
        );
      }

      return cachedDb;
    }

    /**
     * Clear the cached Firestore instance and reset Firebase bootstrap state.
     * @returns {void}
     */
    function clearFirestoreInstanceCache() {
      cachedDb = null;
      firebaseInitializationHandlers.reset();
    }

    return { getFirestoreInstance, clearFirestoreInstanceCache };
  }

  const { getFirestoreInstance, clearFirestoreInstanceCache } =
    createFirestoreInstanceHandlers(firebaseInitializationHandlers);

  /**
   * Ensure Firebase has been initialized once for this entrypoint.
   * @param {() => unknown} [initFn] Initialization function to invoke on first use.
   * @returns {void}
   */
  function ensureFirebaseApp(initFn = deps.initializeApp) {
    if (firebaseInitialization.hasBeenInitialized()) {
      return;
    }

    try {
      initFn();
    } catch (error) {
      if (!isDuplicateAppError(error)) {
        throw error;
      }
    }

    firebaseInitialization.markInitialized();
  }

  ensureFirebaseApp();
  const db = getFirestoreInstance();
  const auth = deps.getAuth();
  const app = deps.express();

  const corsOptions = createCorsOptions(
    resolveAllowedOrigins,
    deps.getEnvironmentVariables
  );

  app.use(deps.cors(corsOptions));
  configureUrlencodedBodyParser(app, deps.express);

  const firebaseResources = { db, auth, app };

  setupAssignModerationJobRoute(
    firebaseResources,
    createRunVariantQuery,
    deps.now,
    deps.random
  );

  const handle = createAssignModerationJob(deps.functions, firebaseResources);

  return {
    handle,
    testing: {
      firebaseInitialization,
      ensureFirebaseApp,
      resolveFirestoreDatabaseId,
      resolveFirestoreEnvironment,
      shouldUseCustomFirestoreDependencies,
      getFirestoreInstance,
      clearFirestoreInstanceCache,
    },
  };
}
