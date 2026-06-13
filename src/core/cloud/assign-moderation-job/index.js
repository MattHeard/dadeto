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
  createFirestoreInstance,
  resolveFirestoreDatabaseId,
} from '../firestore-helpers.js';
import { resolveAllowedOrigins, isDuplicateAppError } from '../cloud-core.js';

/**
 * Build the assign-moderation-job entrypoint from injected dependencies.
 * @param {{
 *   functions: {
 *     region: (region: string) => {
 *       firestore: {
 *         document: (path: string) => { onCreate: (handler: Function) => unknown },
 *       },
 *       https: { onRequest: (handler: Function) => unknown },
 *     },
 *   },
 *   express: Function & { urlencoded: (options: { extended: boolean }) => unknown },
 *   cors: (options: unknown) => unknown,
 *   initializeApp: () => unknown,
 *   getAuth: () => unknown,
 *   getFirestore: Function,
 *   getEnvironmentVariables: () => Record<string, unknown>,
 *   now: () => number,
 *   random: () => number,
 * }} deps Runtime dependencies supplied by the cloud wrapper.
 * @returns {{
 *   handle: unknown,
 *   testing: {
 *     firebaseInitialization: unknown,
 *     ensureFirebaseApp: (initFn?: () => unknown) => void,
 *     resolveFirestoreDatabaseId: typeof resolveFirestoreDatabaseId,
 *     resolveFirestoreEnvironment: typeof resolveFirestoreEnvironment,
 *     shouldUseCustomFirestoreDependencies: typeof shouldUseCustomFirestoreDependencies,
 *     getFirestoreInstance: (options?: Record<string, unknown>) => unknown,
 *     clearFirestoreInstanceCache: () => void,
 *   },
 * }} Cloud entrypoint exports and test hooks.
 */
export function createAssignModerationJobEntrypoint(deps) {
  const typedDeps = /** @type {any} */ (deps);
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
    /** @type {import('firebase-admin/firestore').Firestore | null} */
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
        getFirestoreFn = typedDeps.getFirestore,
        environment: providedEnvironment,
      } = options;

      const environment = resolveFirestoreEnvironment(
        /** @type {Record<string, unknown> | undefined} */ (
          providedEnvironment
        ),
        typedDeps.getEnvironmentVariables
      );

      ensureAppFn();

      const databaseId = resolveFirestoreDatabaseId(
        /** @type {Record<string, unknown>} */ (environment ?? {})
      );
      const useCustomDependencies = shouldUseCustomFirestoreDependencies({
        options,
        defaultEnsureFn: defaultEnsureFirebaseApp,
        defaultGetFirestoreFn: typedDeps.getFirestore,
        providedEnvironment,
      });

      if (useCustomDependencies) {
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
  const auth = typedDeps.getAuth();
  const app = typedDeps.express();

  const corsOptions = createCorsOptions(
    resolveAllowedOrigins,
    typedDeps.getEnvironmentVariables
  );

  app.use(typedDeps.cors(corsOptions));
  configureUrlencodedBodyParser(app, typedDeps.express);

  const firebaseResources = /** @type {any} */ ({ db, auth, app });

  setupAssignModerationJobRoute(
    firebaseResources,
    createRunVariantQuery,
    typedDeps.now,
    typedDeps.random
  );

  const handle = createAssignModerationJob(
    typedDeps.functions,
    firebaseResources
  );

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
