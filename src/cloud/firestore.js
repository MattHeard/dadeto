import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import { createFirebaseAppManager } from './common-gcf.js';

const { ensureFirebaseApp, resetFirebaseInitializationState } =
  createFirebaseAppManager(initializeApp);

/**
 * Parse the database identifier from the Firebase configuration.
 * @param {Record<string, unknown>} environment Process environment variables.
 * @returns {string | null} The configured database identifier when available.
 */
export function resolveFirestoreDatabaseId(environment) {
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

/** @type {import('firebase-admin/firestore').Firestore | null} */
let cachedDb = null;

/**
 * @typedef {(app?: unknown, databaseId?: string) => import('firebase-admin/firestore').Firestore} FirestoreFactoryFn
 *
 * Create or return the cached Firestore instance for the active environment.
 * @param {{
 *   ensureAppFn?: () => void,
 *   getFirestoreFn?: FirestoreFactoryFn,
 *   environment?: Record<string, unknown>,
 * }} [options] Optional dependency overrides for testing.
 * @returns {import('firebase-admin/firestore').Firestore} Firestore client instance.
 */
export function getFirestoreInstance(options = {}) {
  const {
    ensureAppFn = ensureFirebaseApp,
    getFirestoreFn = /** @type {FirestoreFactoryFn} */ (getAdminFirestore),
    environment = process.env,
  } = options;

  ensureAppFn();

  const databaseId = resolveFirestoreDatabaseId(environment);
  if (
    shouldBypassFirestoreCache({
      ensureAppFn,
      getFirestoreFn,
      environment,
    })
  ) {
    return getFirestoreForDatabase(getFirestoreFn, undefined, databaseId);
  }

  if (!cachedDb) {
    cachedDb = getFirestoreForDatabase(getFirestoreFn, undefined, databaseId);
  }

  return cachedDb;
}

/**
 * Reset the cached Firestore instance. Primarily used in tests.
 */
export function clearFirestoreInstanceCache() {
  cachedDb = null;
  resetFirebaseInitializationState();
}

/**
 * Select the correct Firestore database given the parsed configuration.
 * @param {FirestoreFactoryFn} getFirestoreFn Firestore factory.
 * @param {unknown} firebaseApp Firebase Admin app instance.
 * @param {string | null} databaseId Desired Firestore database identifier.
 * @returns {import('firebase-admin/firestore').Firestore} Configured Firestore client.
 */
function getFirestoreForDatabase(getFirestoreFn, firebaseApp, databaseId) {
  if (databaseId && databaseId !== '(default)') {
    if (!firebaseApp) {
      return getFirestoreFn(databaseId);
    }

    return getFirestoreFn(firebaseApp, databaseId);
  }

  return getFirestoreFn(firebaseApp);
}

/**
 * Determine whether dependency overrides require bypassing the shared cache.
 * @param {{
 *   ensureAppFn: typeof ensureFirebaseApp,
 *   getFirestoreFn: typeof getAdminFirestore,
 *   environment: Record<string, unknown>,
 * }} options Dependency overrides provided to {@link getFirestoreInstance}.
 * @returns {boolean} True when the cache should not be used.
 */
function shouldBypassFirestoreCache({
  ensureAppFn,
  getFirestoreFn,
  environment,
}) {
  return (
    ensureAppFn !== ensureFirebaseApp ||
    getFirestoreFn !== getAdminFirestore ||
    environment !== process.env
  );
}
