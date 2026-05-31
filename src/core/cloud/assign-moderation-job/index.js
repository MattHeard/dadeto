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
import { resolveAllowedOrigins, isDuplicateAppError } from '../cloud-core.js';

export function createAssignModerationJobEntrypoint(deps) {
  const firebaseInitialization = createFirebaseInitialization();
  const firebaseInitializationHandlers = {
    reset: () => {
      firebaseInitialization.reset();
    },
  };

  const defaultEnsureFirebaseApp = () => {};

  function createFirestoreInstanceHandlers(firebaseInitializationHandlers) {
    let cachedDb = null;

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
        cachedDb = getFirestoreForDatabase(getFirestoreFn, undefined, databaseId);
      }

      return cachedDb;
    }

    function clearFirestoreInstanceCache() {
      cachedDb = null;
      firebaseInitializationHandlers.reset();
    }

    return { getFirestoreInstance, clearFirestoreInstanceCache };
  }

  function resolveFirestoreDatabaseId(environment) {
    const rawConfig = environment.FIREBASE_CONFIG;

    if (typeof rawConfig !== 'string' || rawConfig.trim() === '') {
      return null;
    }

    try {
      const parsed = JSON.parse(rawConfig);
      const { databaseId } = parsed;

      if (typeof databaseId === 'string' && databaseId.trim() !== '') {
        return databaseId;
      }
    } catch {
      // Ignore malformed configuration strings and fall back to the default DB.
    }

    return null;
  }

  function getFirestoreForDatabase(getFirestoreFn, firebaseApp, databaseId) {
    if (databaseId && databaseId !== '(default)') {
      if (!firebaseApp) {
        return getFirestoreFn(databaseId);
      }

      return getFirestoreFn(firebaseApp, databaseId);
    }

    return getFirestoreFn(firebaseApp);
  }

  const { getFirestoreInstance, clearFirestoreInstanceCache } =
    createFirestoreInstanceHandlers(firebaseInitializationHandlers);

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
    Math.random
  );

  const handle = createAssignModerationJob(
    deps.functions,
    firebaseResources
  );

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
