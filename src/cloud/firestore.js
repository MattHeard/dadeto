import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import {
  ensureFirebaseApp,
  resetFirebaseInitializationState,
} from './firebaseApp.js';

/**
 * Parse the database identifier from the Firebase configuration.
 * @param {Record<string, unknown>} environment Process environment variables.
 * @returns {string | null} The configured database identifier when available.
 */
export function resolveFirestoreDatabaseId(environment = process.env) {
  const rawConfig = environment?.FIREBASE_CONFIG;

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

let cachedDb = null;

/**
 * Create or return the cached Firestore instance for the active environment.
 * @param {{
 *   getFirestoreFn?: (
 *     app?: import('firebase-admin/app').App,
 *     databaseId?: string,
 *   ) => import('firebase-admin/firestore').Firestore,
 *   environment?: Record<string, unknown>,
 * }} [options] Optional dependency overrides for testing.
 * @returns {import('firebase-admin/firestore').Firestore} Firestore client instance.
 */
export function getFirestoreInstance(options = {}) {
  const {
    ensureAppFn = ensureFirebaseApp,
    getFirestoreFn = getAdminFirestore,
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
