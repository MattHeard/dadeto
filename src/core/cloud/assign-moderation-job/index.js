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
  resolveFirestoreDatabaseId,
  createFirestoreInstanceCache,
  createFirestoreInstanceResolver,
} from '../firestore-helpers.js';
import { resolveAllowedOrigins, isDuplicateAppError } from '../cloud-core.js';

/**
 * Build the assign-moderation-job entrypoint from injected dependencies.
 * @param {{
 *   functions: {
 *     region: (region: string) => {
 *       firestore: {
 *         document: (path: string) => { onCreate: (handler: (snapshot: unknown, context: unknown) => unknown) => unknown },
 *       },
 *       https: { onRequest: (handler: unknown) => unknown },
 *     },
 *   },
 *   express: typeof import('express'),
 *   cors: (options: unknown) => import('express').RequestHandler,
 *   initializeApp: () => unknown,
 *   getAuth: () => unknown,
 *   getFirestore: typeof import('firebase-admin/firestore').getFirestore,
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
  const typedDeps = deps;
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
    const firestoreCache = createFirestoreInstanceCache();
    const getFirestoreInstance = createFirestoreInstanceResolver({
      cache: firestoreCache,
      defaultEnsureAppFn: defaultEnsureFirebaseApp,
      defaultGetFirestoreFn: typedDeps.getFirestore,
      resolveEnvironment: options =>
        /** @type {Record<string, unknown>} */ (
          resolveFirestoreEnvironment(
            /** @type {Record<string, unknown> | undefined} */ (
              options.environment
            ),
            typedDeps.getEnvironmentVariables
          ) ?? {}
        ),
      shouldCache: ({ options }) =>
        !shouldUseCustomFirestoreDependencies({
          options,
          defaultEnsureFn: defaultEnsureFirebaseApp,
          defaultGetFirestoreFn: typedDeps.getFirestore,
          providedEnvironment: options.environment,
        }),
    });

    /**
     * Clear the cached Firestore instance and reset Firebase bootstrap state.
     * @returns {void}
     */
    function clearFirestoreInstanceCache() {
      firestoreCache.value = null;
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
    initializeFirebaseApp(initFn);
    firebaseInitialization.markInitialized();
  }

  /**
   * Initialize Firebase while tolerating the SDK's duplicate-app signal.
   * @param {() => unknown} initFn Firebase initializer.
   * @returns {void} Nothing.
   */
  function initializeFirebaseApp(initFn) {
    try {
      initFn();
    } catch (error) {
      if (!isDuplicateAppError(error)) {
        throw error;
      }
    }
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

  const firebaseResources =
    /** @type {{ db: import('firebase-admin/firestore').Firestore, auth: import('firebase-admin/auth').Auth, app: import('../../../../types/native-http').NativeExpressApp }} */ ({
      db,
      auth,
      app,
    });

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
