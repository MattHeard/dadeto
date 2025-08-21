/**
 * Choose a random page number that is not already taken.
 * @param {import('firebase-admin/firestore').Firestore} db Firestore instance.
 * @param {number} [i=0] Recursion depth used to widen the search range.
 * @returns {Promise<number>} A unique page number.
 */
export async function findAvailablePageNumber(db, i = 0) {
  const max = 2 ** i;
  const candidate = Math.floor(Math.random() * max) + 1;
  const existing = await db
    .collectionGroup('pages')
    .where('number', '==', candidate)
    .limit(1)
    .get();
  if (existing.empty) {
    return candidate;
  }
  return findAvailablePageNumber(db, i + 1);
}
