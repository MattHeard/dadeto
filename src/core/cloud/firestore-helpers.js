/**
 * Build a page lookup query scoped to a page number.
 * @param {import('firebase-admin/firestore').Firestore} database Firestore instance.
 * @param {number} pageNumber Page number to match.
 * @returns {import('firebase-admin/firestore').Query} Firestore query.
 */
export function buildPageByNumberQuery(database, pageNumber) {
  return database
    .collectionGroup('pages')
    .where('number', '==', pageNumber)
    .limit(1);
}

/**
 * Build a variant lookup query scoped to a page document and variant name.
 * @param {import('firebase-admin/firestore').DocumentReference} pageRef Page document reference.
 * @param {string} variantName Variant name to match.
 * @returns {import('firebase-admin/firestore').Query} Firestore query.
 */
export function buildVariantByNameQuery(pageRef, variantName) {
  return pageRef
    .collection('variants')
    .where('name', '==', variantName)
    .limit(1);
}
