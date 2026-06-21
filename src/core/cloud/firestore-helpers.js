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
