/**
 * Find a reference to the page document.
 * @param {import('firebase-admin/firestore').Firestore} database Firestore instance.
 * @param {number} pageNumber Page number.
 * @param {{
 *   findPagesSnap: (db: import('firebase-admin/firestore').Firestore, pageNumber: number) => Promise<import('firebase-admin/firestore').QuerySnapshot>,
 *   refFromSnap: (snap: import('firebase-admin/firestore').QuerySnapshot) => import('firebase-admin/firestore').DocumentReference | null,
 * }} firebase Firebase helpers.
 * @returns {Promise<import('firebase-admin/firestore').DocumentReference | null>} Page doc ref.
 */
export async function findPageRef(database, pageNumber, firebase) {
  const pagesSnap = await firebase.findPagesSnap(database, pageNumber);
  return firebase.refFromSnap(pagesSnap);
}
