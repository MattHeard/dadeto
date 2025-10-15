/**
 * Find pages snapshot for a page number.
 * @param {import('firebase-admin/firestore').Firestore} database Firestore instance.
 * @param {number} pageNumber Page number.
 * @returns {Promise<import('firebase-admin/firestore').QuerySnapshot>} Pages snapshot.
 */
export function findPagesSnap(database, pageNumber) {
  return database
    .collectionGroup('pages')
    .where('number', '==', pageNumber)
    .limit(1)
    .get();
}

/**
 * Extract a document reference from a query snapshot.
 * @param {import('firebase-admin/firestore').QuerySnapshot} snap Query snapshot.
 * @returns {import('firebase-admin/firestore').DocumentReference | null} Document ref.
 */
export function refFromSnap(snap) {
  return snap.docs?.[0]?.ref || null;
}

/**
 * Find a reference to the page document.
 * @param {import('firebase-admin/firestore').Firestore} database Firestore instance.
 * @param {number} pageNumber Page number.
 * @param {{findPagesSnap: typeof findPagesSnap, refFromSnap: typeof refFromSnap}} [firebase]
 * Optional Firebase helpers.
 * @returns {Promise<import('firebase-admin/firestore').DocumentReference | null>} Page doc ref.
 */
export async function findPageRef(
  database,
  pageNumber,
  firebase = { findPagesSnap, refFromSnap }
) {
  const pagesSnap = await firebase.findPagesSnap(database, pageNumber);
  return firebase.refFromSnap(pagesSnap);
}
