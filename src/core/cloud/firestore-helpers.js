// @ts-nocheck
/* istanbul ignore file */
// @ts-nocheck
/* istanbul ignore file */
export {
  buildPageByNumberQuery,
  buildVariantByNameQuery,
} from './cloud-core.js';

/**
 * Parse the database identifier from the runtime environment.
 * @param {Record<string, unknown>} environment Process environment variables.
 * @returns {string | null} The configured database identifier when available.
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
export function getFirestoreForDatabase(
  getFirestoreFn,
  firebaseApp,
  databaseId
) {
  if (databaseId && databaseId !== '(default)') {
    if (!firebaseApp) {
      return getFirestoreFn(undefined, databaseId);
    }

    return getFirestoreFn(firebaseApp, databaseId);
  }

  return getFirestoreFn(firebaseApp);
}
