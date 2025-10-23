/**
 * Fetch the Firestore document containing API key credit information.
 * @param {import('@google-cloud/firestore').Firestore} firestoreInstance Firestore client used for queries.
 * @param {string|number} uuid Identifier for the API key credit document.
 * @returns {Promise<import('@google-cloud/firestore').DocumentSnapshot>} The matching Firestore document snapshot.
 */
export function fetchApiKeyCreditDocument(firestoreInstance, uuid) {
  return firestoreInstance.collection('api-key-credit').doc(String(uuid)).get();
}
