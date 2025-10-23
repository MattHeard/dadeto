/**
 * Instantiate a Firestore client using the supplied constructor.
 * @param {typeof import('@google-cloud/firestore').Firestore} FirestoreConstructor Firestore constructor.
 * @returns {import('@google-cloud/firestore').Firestore} Initialized Firestore client.
 */
export function createFirestore(FirestoreConstructor) {
  return new FirestoreConstructor();
}
