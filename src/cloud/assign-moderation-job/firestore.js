import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { resetFirebaseInitializationState } from './firebaseApp.js';

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

const defaultEnsureFirebaseApp = () => {};

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

export function getFirestoreInstance(options = {}) {
  const {
    ensureAppFn = defaultEnsureFirebaseApp,
    getFirestoreFn = getAdminFirestore,
    environment = process.env,
  } = options;

  ensureAppFn();

  const databaseId = resolveFirestoreDatabaseId(environment);
  const useCustomDependencies =
    ensureAppFn !== defaultEnsureFirebaseApp ||
    getFirestoreFn !== getAdminFirestore ||
    environment !== process.env;

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
