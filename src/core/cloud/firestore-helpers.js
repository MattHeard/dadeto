export {
  buildPageByNumberQuery,
  buildVariantByNameQuery,
} from './cloud-core.js';

/**
 * Parse the database identifier from the runtime environment.
 * @param {Record<string, unknown>} environment Process environment variables.
 * @returns {string} The configured database identifier.
 * @throws {Error} When the runtime environment does not provide one.
 */
export function resolveFirestoreDatabaseId(environment) {
  const explicitDatabaseId = environment.DATABASE_ID;
  if (
    typeof explicitDatabaseId === 'string' &&
    explicitDatabaseId.trim() !== ''
  ) {
    return explicitDatabaseId;
  }

  const deploymentEnvironment = environment.DENDRITE_ENVIRONMENT;
  if (
    typeof deploymentEnvironment === 'string' &&
    deploymentEnvironment.startsWith('t-')
  ) {
    return deploymentEnvironment;
  }

  throw new Error(
    'Firestore database id is required. Set DATABASE_ID or use a t-* deployment environment.'
  );
}

/**
 * Check whether Firestore dependencies match the process-default cache boundary.
 * @param {{ ensureAppFn: () => void, getFirestoreFn: Function, environment: Record<string, unknown>, defaultEnsureAppFn: () => void, defaultGetFirestoreFn: Function, defaultEnvironment: Record<string, unknown> }} options Dependencies and their process defaults.
 * @returns {boolean} True when it is safe to use the process cache.
 */
export function isDefaultFirestoreContext({
  ensureAppFn,
  getFirestoreFn,
  environment,
  defaultEnsureAppFn,
  defaultGetFirestoreFn,
  defaultEnvironment,
}) {
  return (
    ensureAppFn === defaultEnsureAppFn &&
    getFirestoreFn === defaultGetFirestoreFn &&
    environment === defaultEnvironment
  );
}

/**
 * Create a cache-context check bound to one module's default Firestore dependencies.
 * @param {() => void} defaultEnsureAppFn Default app initializer.
 * @param {Function} defaultGetFirestoreFn Default Firestore factory.
 * @param {Record<string, unknown>} defaultEnvironment Default environment object.
 * @returns {(options: {ensureAppFn: () => void, getFirestoreFn: Function, environment: Record<string, unknown>}) => boolean} Context checker.
 */
export function createDefaultFirestoreContextChecker(
  defaultEnsureAppFn,
  defaultGetFirestoreFn,
  defaultEnvironment
) {
  return options =>
    isDefaultFirestoreContext({
      ...options,
      defaultEnsureAppFn,
      defaultGetFirestoreFn,
      defaultEnvironment,
    });
}

/**
 * Create an empty cache for a Firestore instance.
 * @returns {{value: import('firebase-admin/firestore').Firestore | null}} Empty Firestore cache.
 */
export function createFirestoreInstanceCache() {
  return { value: null };
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
export function getFirestoreForDatabase(
  getFirestoreFn,
  firebaseApp,
  databaseId
) {
  const firestoreFactory = /** @type {any} */ (getFirestoreFn);
  if (databaseId && databaseId !== '(default)') {
    if (!firebaseApp) {
      return firestoreFactory(/** @type {any} */ (undefined), databaseId);
    }

    return firestoreFactory(firebaseApp, databaseId);
  }

  return firestoreFactory(firebaseApp);
}

/**
 * Create a Firestore instance for the requested database id.
 * @param {(
 *   app?: import('firebase-admin/app').App,
 *   databaseId?: string,
 * ) => import('firebase-admin/firestore').Firestore} getFirestoreFn Firestore factory.
 * @param {string} databaseId Firestore database identifier.
 * @returns {import('firebase-admin/firestore').Firestore} Firestore client.
 */
export function createFirestoreInstance(getFirestoreFn, databaseId) {
  return getFirestoreForDatabase(
    getFirestoreFn,
    /** @type {any} */ (undefined),
    databaseId
  );
}

/**
 * Resolve a Firestore instance while preserving caller-specific cache policy.
 * @param {{
 *   cache: {value: import('firebase-admin/firestore').Firestore | null},
 *   ensureAppFn: () => void,
 *   getFirestoreFn: (app?: import('firebase-admin/app').App, databaseId?: string) => import('firebase-admin/firestore').Firestore,
 *   environment: Record<string, unknown>,
 *   shouldCache: () => boolean,
 * }} options Firestore dependencies and cache policy.
 * @returns {import('firebase-admin/firestore').Firestore} Cached or newly created Firestore instance.
 */
export function getFirestoreInstanceFromCache({
  cache,
  ensureAppFn,
  getFirestoreFn,
  environment,
  shouldCache,
}) {
  ensureAppFn();
  const databaseId = resolveFirestoreDatabaseId(environment);
  if (!shouldCache()) {
    return createFirestoreInstance(getFirestoreFn, databaseId);
  }
  if (cache.value === null) {
    cache.value = createFirestoreInstance(getFirestoreFn, databaseId);
  }
  return cache.value;
}
