/**
 * Retrieve the Firestore snapshot for an API key credit document.
 * @param {import('@google-cloud/firestore').Firestore} database Firestore instance.
 * @param {string} uuid API key UUID.
 * @returns {Promise<import('@google-cloud/firestore').DocumentSnapshot>} Firestore snapshot.
 */
export function getApiKeyCreditSnapshot(database, uuid) {
  return database.collection('api-key-credit').doc(String(uuid)).get();
}
