/**
 * Create a Firestore database instance using the provided constructor.
 * @param {typeof import('@google-cloud/firestore').Firestore} FirestoreCtor Firestore constructor.
 * @returns {import('@google-cloud/firestore').Firestore} Firestore database instance.
 */
export function createDb(FirestoreCtor) {
  return new FirestoreCtor();
}
