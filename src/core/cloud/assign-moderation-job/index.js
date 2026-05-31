// @ts-nocheck
/* istanbul ignore file */
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
 *
 * @param deps
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
   *
   * @param firebaseInitializationHandlers
   */
  function createFirestoreInstanceHandlers(firebaseInitializationHandlers) {
    let cachedDb = null;

    /**
     *
     * @param options
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
     *
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
   *
   * @param initFn
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
      resolveFirestoreDatabaseId,
      resolveFirestoreEnvironment,
      shouldUseCustomFirestoreDependencies,
      getFirestoreInstance,
      clearFirestoreInstanceCache,
    },
  };
}
