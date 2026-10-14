import {
  createAssignModerationJob,
  createFirebaseInitialization,
  createCorsOptions,
  configureUrlencodedBodyParser,
  createRunVariantQuery,
  createAssignVariantToModerator,
  createHandleAssignModerationJobFromAuth,
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

/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */
/**
 * @typedef {object} FirestoreQueryDatabase
 * @property {(collectionId: string) => import('firebase-admin/firestore').Query} collectionGroup Query-only collection-group access.
 * @property {(collectionId: string) => { where: (fieldPath: string, opStr: string, value: unknown) => import('firebase-admin/firestore').Query }} collection Query-only collection access.
 */

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
 *   initializeFirebaseApp: (permission: AllowEffects, initializeApp: () => unknown) => unknown,
 *   getAuth: () => unknown,
 *   getFirestore: (app?: import('firebase-admin/app').App, databaseId?: string) => unknown,
 *   getEnvironmentVariables: () => Record<string, unknown>,
 *   now: () => number,
 *   random: () => number,
 *   bindEffectBoundary: import('../../../../types/allow-effects').AllowEffectsBoundary,
 *   logDebug: (permission: AllowEffects, ...values: unknown[]) => void,
 *   useMiddleware: (permission: AllowEffects, app: import('../../../../types/native-http').NativeExpressApp, middleware: unknown) => void,
 *   registerPostRoute: (permission: AllowEffects, app: import('../../../../types/native-http').NativeExpressApp, path: string, handler: (req: import('../../../../types/native-http').NativeHttpRequest, res: import('../../../../types/native-http').NativeHttpResponse) => unknown) => void,
 *   createSetModeratorAssignment: (database: unknown) => (permission: AllowEffects, uid: string, data: object) => Promise<unknown>,
 *   sendHttpResponse: (permission: AllowEffects, response: import('../../../../types/native-http').NativeHttpResponse, status: number, body: unknown) => void,
 * }} deps Runtime dependencies supplied by the cloud wrapper.
 * @returns {Promise<{
 *   handle: unknown,
 *   testing: {
 *     firebaseInitialization: unknown,
 *     ensureFirebaseApp: (permission: AllowEffects, initFn?: () => unknown) => void,
 *     resolveFirestoreDatabaseId: typeof resolveFirestoreDatabaseId,
 *     resolveFirestoreEnvironment: typeof resolveFirestoreEnvironment,
 *     shouldUseCustomFirestoreDependencies: typeof shouldUseCustomFirestoreDependencies,
 *     getFirestoreInstance: (permission: AllowEffects, options?: Record<string, unknown>) => unknown,
 *     clearFirestoreInstanceCache: () => void,
 *   },
 * }>} Cloud entrypoint exports and test hooks.
 */
export async function createAssignModerationJobEntrypoint(deps) {
  const typedDeps = deps;
  const firebaseInitialization = createFirebaseInitialization();
  const firebaseInitializationHandlers = {
    reset: () => {
      firebaseInitialization.reset();
    },
  };

  const defaultEnsureFirebaseApp = (/** @type {AllowEffects} */ permission) =>
    void permission;

  /**
   * Create Firestore helpers that share a cache and a reset hook.
   * @param {{ reset: () => void }} firebaseInitializationHandlers Reset hook for the Firebase bootstrap state.
   * @returns {{
   *   getFirestoreInstance: (permission: AllowEffects, options?: {
   *     ensureAppFn?: (permission: AllowEffects) => void,
   *     getFirestoreFn?: typeof import('firebase-admin/firestore').getFirestore,
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
      defaultGetFirestoreFn:
        /** @type {typeof import('firebase-admin/firestore').getFirestore} */ (
          typedDeps.getFirestore
        ),
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
   * @param {AllowEffects} permission Startup initialization capability.
   * @param {() => unknown} [initFn] Initialization function to invoke on first use.
   * @returns {void}
   */
  function ensureFirebaseApp(permission, initFn = deps.initializeApp) {
    if (firebaseInitialization.hasBeenInitialized()) {
      return;
    }
    initializeFirebaseApp(permission, initFn, typedDeps.initializeFirebaseApp);
    firebaseInitialization.markInitialized();
  }

  /**
   * Initialize Firebase while tolerating the SDK's duplicate-app signal.
   * @param {AllowEffects} permission Startup initialization capability.
   * @param {() => unknown} initFn Firebase initializer.
   * @param {(permission: AllowEffects, initializeApp: () => unknown) => unknown} initializeFirebaseAppEffect Permission-aware cloud adapter.
   * @returns {void} Nothing.
   */
  function initializeFirebaseApp(
    permission,
    initFn,
    initializeFirebaseAppEffect
  ) {
    try {
      initializeFirebaseAppEffect(permission, initFn);
    } catch (error) {
      if (!isDuplicateAppError(error)) {
        throw error;
      }
    }
  }

  const database = await typedDeps.bindEffectBoundary(async permission => {
    ensureFirebaseApp(permission);
    return getFirestoreInstance(permission);
  });
  const db = /** @type {FirestoreQueryDatabase} */ (database);
  const setModeratorAssignment =
    typedDeps.createSetModeratorAssignment(database);
  const auth = typedDeps.getAuth();
  const app = typedDeps.express();

  const corsOptions = await typedDeps.bindEffectBoundary(async permission =>
    createCorsOptions(
      permission,
      resolveAllowedOrigins,
      typedDeps.getEnvironmentVariables,
      typedDeps.logDebug
    )
  );

  void typedDeps.bindEffectBoundary(permission => {
    typedDeps.useMiddleware(permission, app, typedDeps.cors(corsOptions));
    return Promise.resolve();
  });
  void typedDeps.bindEffectBoundary(permission => {
    configureUrlencodedBodyParser(
      permission,
      app,
      typedDeps.express,
      typedDeps.useMiddleware
    );
    return Promise.resolve();
  });

  const firebaseResources =
    /** @type {{ db: typeof db, auth: import('firebase-admin/auth').Auth, app: import('../../../../types/native-http').NativeExpressApp }} */ ({
      db,
      auth,
      app,
    });

  const fetchVariantSnapshots = createRunVariantQuery(firebaseResources.db);
  /** @type {(uid: string, assignment: object) => Promise<unknown>} */
  const persistAssignment = async (uid, assignment) => {
    return typedDeps.bindEffectBoundary(permission =>
      setModeratorAssignment(permission, uid, assignment)
    );
  };
  const assignVariantToModerator = createAssignVariantToModerator(
    fetchVariantSnapshots,
    typedDeps.random,
    typedDeps.now,
    persistAssignment
  );
  const requestHandler = createHandleAssignModerationJobFromAuth(
    firebaseResources.auth,
    assignVariantToModerator,
    typedDeps.bindEffectBoundary,
    typedDeps.sendHttpResponse
  );

  await typedDeps.bindEffectBoundary(permission => {
    setupAssignModerationJobRoute(
      firebaseResources,
      requestHandler,
      permission,
      typedDeps.registerPostRoute
    );
    return Promise.resolve();
  });

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
