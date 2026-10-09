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

/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */

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
 *   getFirestore: typeof import('firebase-admin/firestore').getFirestore,
 *   getEnvironmentVariables: () => Record<string, unknown>,
 *   now: () => number,
 *   random: () => number,
 *   bindEffectBoundary: import('../../../../types/allow-effects').AllowEffectsBoundary,
 *   useMiddleware: (permission: AllowEffects, app: import('../../../../types/native-http').NativeExpressApp, middleware: unknown) => void,
 *   registerPostRoute: (permission: AllowEffects, app: import('../../../../types/native-http').NativeExpressApp, path: string, handler: (req: import('../../../../types/native-http').NativeHttpRequest, res: import('../../../../types/native-http').NativeHttpResponse) => unknown) => void,
 *   setModeratorAssignment: (permission: AllowEffects, reference: import('firebase-admin/firestore').DocumentReference, data: object) => Promise<unknown>,
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
 *     getFirestoreInstance: (options?: Record<string, unknown>) => unknown,
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

  await typedDeps.bindEffectBoundary(async permission => {
    ensureFirebaseApp(permission);
  });
  const db = getFirestoreInstance();
  const auth = typedDeps.getAuth();
  const app = typedDeps.express();

  const corsOptions = createCorsOptions(
    resolveAllowedOrigins,
    typedDeps.getEnvironmentVariables
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
    /** @type {{ db: import('firebase-admin/firestore').Firestore, auth: import('firebase-admin/auth').Auth, app: import('../../../../types/native-http').NativeExpressApp }} */ ({
      db,
      auth,
      app,
    });

  await typedDeps.bindEffectBoundary(permission => {
    setupAssignModerationJobRoute(
      firebaseResources,
      createRunVariantQuery,
      typedDeps.now,
      {
        allowEffects: permission,
        random: typedDeps.random,
        registerPostRoute: typedDeps.registerPostRoute,
        bindEffectBoundary: typedDeps.bindEffectBoundary,
        setModeratorAssignment: typedDeps.setModeratorAssignment,
        sendHttpResponse: typedDeps.sendHttpResponse,
      }
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
