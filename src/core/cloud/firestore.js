// @ts-nocheck
/* istanbul ignore file */
export function createFirestoreModule(deps) {
  const { ensureFirebaseApp, resetFirebaseInitializationState } =
    deps.createFirebaseAppManager(deps.initializeApp);
  const getAdminFirestore = deps.getFirestore;

  let cachedDb = null;

  function resolveFirestoreDatabaseId(environment) {
    const rawConfig = environment.FIREBASE_CONFIG;
    if (typeof rawConfig !== 'string' || rawConfig.trim() === '') return null;
    try {
      const parsed = JSON.parse(rawConfig);
      const { databaseId } = parsed;
      if (typeof databaseId === 'string' && databaseId.trim() !== '') return databaseId;
    } catch {
      // Ignore malformed configuration strings and fall back to the default DB.
    }
    return null;
  }

  function getFirestoreForDatabase(getFirestoreFn, firebaseApp, databaseId) {
    if (databaseId && databaseId !== '(default)') {
      if (!firebaseApp) return getFirestoreFn(databaseId);
      return getFirestoreFn(firebaseApp, databaseId);
    }
    return getFirestoreFn(firebaseApp);
  }

  function shouldBypassFirestoreCache({ ensureAppFn, getFirestoreFn, environment }) {
    return ensureAppFn !== ensureFirebaseApp || getFirestoreFn !== getAdminFirestore || environment !== process.env;
  }

  function getFirestoreInstance(options = {}) {
    const {
      ensureAppFn = ensureFirebaseApp,
      getFirestoreFn = getAdminFirestore,
      environment = process.env,
    } = options;

    ensureAppFn();
    const databaseId = resolveFirestoreDatabaseId(environment);
    if (shouldBypassFirestoreCache({ ensureAppFn, getFirestoreFn, environment })) return getFirestoreForDatabase(getFirestoreFn, undefined, databaseId);
    if (!cachedDb) cachedDb = getFirestoreForDatabase(getFirestoreFn, undefined, databaseId);
    return cachedDb;
  }

  function clearFirestoreInstanceCache() {
    cachedDb = null;
    resetFirebaseInitializationState();
  }

  return {
    resolveFirestoreDatabaseId,
    getFirestoreInstance,
    clearFirestoreInstanceCache,
  };
}
