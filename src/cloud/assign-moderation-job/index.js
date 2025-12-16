import {
  functions,
  express,
  cors,
  initializeApp,
  getAuth,
  getFirestore as getAdminFirestore,
  getEnvironmentVariables,
  now,
} from './assign-moderation-job-gcf.js';
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
import { resolveAllowedOrigins, isDuplicateAppError } from './cloud-core.js';

const firebaseInitialization = createFirebaseInitialization();

/**
 * Reset the initialization flag. Primarily used in tests.
 */
const firebaseInitializationHandlers = {
  reset: () => {
    firebaseInitialization.reset();
  },
};

const defaultEnsureFirebaseApp = () => {};

/**
 * Create handlers for retrieving and clearing Firestore instances.
 * @param {{ reset: () => void }} firebaseInitializationHandlers Handlers that
 *   manage Firebase initialization state.
 * @returns {{
 *   getFirestoreInstance: (options?: {
 *     ensureAppFn?: () => void,
 *     getFirestoreFn?: (
 *       app?: import('firebase-admin/app').App,
 *       databaseId?: string,
 *     ) => import('firebase-admin/firestore').Firestore,
 *     environment?: Record<string, unknown>,
 *   }) => import('firebase-admin/firestore').Firestore,
 *   clearFirestoreInstanceCache: () => void,
 * }} Utility functions for interacting with the Firestore client cache.
 */
function createFirestoreInstanceHandlers(firebaseInitializationHandlers) {
  let cachedDb = null;

  /**
   * Create or return the cached Firestore instance for the active environment.
   * @param {{
   *   ensureAppFn?: () => void,
   *   getFirestoreFn?: (
   *     app?: import('firebase-admin/app').App,
   *     databaseId?: string,
   *   ) => import('firebase-admin/firestore').Firestore,
   *   environment?: Record<string, unknown>,
   * }} [options] Optional dependency overrides for testing. When omitted,
   * the function assumes the Firebase app was initialized by the caller.
   * @returns {import('firebase-admin/firestore').Firestore} Firestore client instance.
   */
  function getFirestoreInstance(options = {}) {
    const {
      ensureAppFn = defaultEnsureFirebaseApp,
      getFirestoreFn = getAdminFirestore,
      environment: providedEnvironment,
    } = options;

    const environment = resolveFirestoreEnvironment(
      providedEnvironment,
      getEnvironmentVariables
    );

    ensureAppFn();

    const databaseId = resolveFirestoreDatabaseId(environment);
    const useCustomDependencies = shouldUseCustomFirestoreDependencies({
      options,
      defaultEnsureFn: defaultEnsureFirebaseApp,
      defaultGetFirestoreFn: getAdminFirestore,
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

  /**
   * Reset the cached Firestore instance. Primarily used in tests.
   * @returns {void}
   */
  function clearFirestoreInstanceCache() {
    cachedDb = null;
    firebaseInitializationHandlers.reset();
  }

  return { getFirestoreInstance, clearFirestoreInstanceCache };
}

/**
 * Parse the database identifier from the Firebase configuration.
 * @param {Record<string, unknown>} environment Process environment variables.
 * @returns {string | null} The configured database identifier when available.
 */
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

/**
 * Select the correct Firestore database given the parsed configuration.
 * @param {(
 *   app?: import('firebase-admin/app').App,
 *   databaseId?: string,
 * ) => import('firebase-admin/firestore').Firestore} getFirestoreFn Firestore factory.
 * @param {import('firebase-admin/app').App} firebaseApp Firebase Admin app instance.
 * @param {string | null} databaseId Desired Firestore database identifier.
 * @returns {import('firebase-admin/firestore').Firestore} Configured Firestore client.
 */
function getFirestoreForDatabase(getFirestoreFn, firebaseApp, databaseId) {
  if (databaseId && databaseId !== '(default)') {
    return getFirestoreFn(firebaseApp, databaseId);
  }

  return getFirestoreFn(firebaseApp);
}

const { getFirestoreInstance, clearFirestoreInstanceCache } =
  createFirestoreInstanceHandlers(firebaseInitializationHandlers);

/**
 * Ensure the default Firebase Admin app is initialized.
 * @param {() => void} [initFn] Optional initializer for dependency injection.
 * @returns {void}
 */
function ensureFirebaseApp(initFn = initializeApp) {
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
const auth = getAuth();
const app = express();

const corsOptions = createCorsOptions(
  resolveAllowedOrigins,
  getEnvironmentVariables
);

app.use(cors(corsOptions));
configureUrlencodedBodyParser(app, express);

const firebaseResources = { db, auth, app };

setupAssignModerationJobRoute(firebaseResources, createRunVariantQuery, now);

export const assignModerationJob = createAssignModerationJob(
  functions,
  firebaseResources
);

export const testing = {
  firebaseInitialization,
  resolveFirestoreDatabaseId,
  resolveFirestoreEnvironment,
  shouldUseCustomFirestoreDependencies,
  getFirestoreInstance,
  clearFirestoreInstanceCache,
};
