export {
  buildPageByNumberQuery,
  buildVariantByNameQuery,
} from './cloud-core.js';

/** @typedef {{ensureAppFn?: () => void, getFirestoreFn?: (app?: import('firebase-admin/app').App, databaseId?: string) => import('firebase-admin/firestore').Firestore, environment?: Record<string, unknown>}} FirestoreInstanceOptions */
/** @typedef {{ensureAppFn: () => void, getFirestoreFn: Function, environment: Record<string, unknown>}} FirestoreDependencyContext */
/** @typedef {{cache: {value: import('firebase-admin/firestore').Firestore | null}, defaultEnsureAppFn: () => void, defaultGetFirestoreFn: NonNullable<FirestoreInstanceOptions['getFirestoreFn']>, resolveEnvironment: (options: FirestoreInstanceOptions) => Record<string, unknown>, shouldCache: (context: {options: FirestoreInstanceOptions, ensureAppFn: () => void, getFirestoreFn: NonNullable<FirestoreInstanceOptions['getFirestoreFn']>, environment: Record<string, unknown>}) => boolean}} FirestoreInstanceResolverDependencies */

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
 * @param {FirestoreDependencyContext} context Caller dependencies.
 * @param {FirestoreDependencyContext} defaults Process-default dependencies.
 * @returns {boolean} True when all dependency identities match.
 */
export function isDefaultFirestoreContext(context, defaults) {
  return (
    context.ensureAppFn === defaults.ensureAppFn &&
    context.getFirestoreFn === defaults.getFirestoreFn &&
    context.environment === defaults.environment
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
    isDefaultFirestoreContext(options, {
      ensureAppFn: defaultEnsureAppFn,
      getFirestoreFn: defaultGetFirestoreFn,
      environment: defaultEnvironment,
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
  const app = firebaseApp ?? undefined;
  if (databaseId && databaseId !== '(default)') {
    return firestoreFactory(app, databaseId);
  }

  return firestoreFactory(app);
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
 * @param {{cache: {value: import('firebase-admin/firestore').Firestore | null}, ensureAppFn: () => void, getFirestoreFn: (app?: import('firebase-admin/app').App, databaseId?: string) => import('firebase-admin/firestore').Firestore, environment: Record<string, unknown>, shouldCache: () => boolean}} options Firestore dependencies and cache policy.
 * @returns {import('firebase-admin/firestore').Firestore} Cached or newly created Firestore instance.
 */
export function getFirestoreInstanceFromCache(options) {
  return resolveFirestoreInstanceFromCache(options, options.shouldCache);
}

/**
 * Resolve a Firestore instance from dependencies and its cache policy.
 * @param {{cache: {value: import('firebase-admin/firestore').Firestore | null}, ensureAppFn: () => void, getFirestoreFn: (app?: import('firebase-admin/app').App, databaseId?: string) => import('firebase-admin/firestore').Firestore, environment: Record<string, unknown>}} options Firestore dependencies.
 * @param {() => boolean} shouldCache Caller-specific cache policy.
 * @returns {import('firebase-admin/firestore').Firestore} Cached or newly created Firestore instance.
 */
function resolveFirestoreInstanceFromCache(options, shouldCache) {
  options.ensureAppFn();
  const databaseId = resolveFirestoreDatabaseId(options.environment);
  const useCache = shouldCache();
  if (useCache && options.cache.value !== null) return options.cache.value;
  const firestore = createFirestoreInstance(options.getFirestoreFn, databaseId);
  if (useCache) options.cache.value = firestore;
  return firestore;
}

/**
 * Create an accessor that resolves environment and cache policy consistently.
 * @param {FirestoreInstanceResolverDependencies} dependencies Resolver dependencies and caller-specific policies.
 * @returns {(options?: FirestoreInstanceOptions) => import('firebase-admin/firestore').Firestore} Configured Firestore accessor.
 */
export function createFirestoreInstanceResolver(dependencies) {
  return function getFirestoreInstance(options = {}) {
    const ensureAppFn = options.ensureAppFn ?? dependencies.defaultEnsureAppFn;
    const getFirestoreFn =
      options.getFirestoreFn ?? dependencies.defaultGetFirestoreFn;
    const environment = dependencies.resolveEnvironment(options);
    const cacheOptions = {
      cache: dependencies.cache,
      ensureAppFn,
      getFirestoreFn,
      environment,
    };
    return resolveFirestoreInstanceFromCache(cacheOptions, () =>
      dependencies.shouldCache({
        options,
        ensureAppFn,
        getFirestoreFn,
        environment,
      })
    );
  };
}
