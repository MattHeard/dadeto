/**
 * Create a Firestore database instance using the provided constructor.
 * @param {new (...args: Array<any>) => import('@google-cloud/firestore').Firestore} FirestoreCtor Firestore constructor.
 * @param {Record<string, string | undefined>} [environment] Runtime environment variables.
 * @returns {import('@google-cloud/firestore').Firestore} Firestore database instance.
 */
export function createDb(FirestoreCtor, environment = process.env) {
  const databaseId =
    environment.DATABASE_ID ?? environment.DENDRITE_ENVIRONMENT;
  if (
    typeof databaseId === 'string' &&
    databaseId.trim() !== '' &&
    databaseId !== '(default)'
  ) {
    return new FirestoreCtor(/** @type {any} */ ({ databaseId }));
  }

  return new FirestoreCtor();
}
