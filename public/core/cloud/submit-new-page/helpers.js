/**
 * Parse a user supplied incoming option reference.
 * @param {string} str Raw option string.
 * @returns {{pageNumber: number, variantName: string, optionNumber: number}|null}
 *   Parsed info or null when invalid.
 */
export function parseIncomingOption(str) {
  if (!str) {
    return null;
  }
  const parts = String(str)
    .split(/[^0-9a-zA-Z]+/)
    .filter(Boolean);
  if (parts.length !== 3) {
    return null;
  }
  const [pageStr, variantName, optionStr] = parts;
  const pageNumber = Number.parseInt(pageStr, 10);
  const optionNumber = Number.parseInt(optionStr, 10);
  if (!/^[a-zA-Z]+$/.test(variantName)) {
    return null;
  }
  if (!Number.isInteger(pageNumber) || !Number.isInteger(optionNumber)) {
    return null;
  }
  const parsed = { pageNumber, variantName, optionNumber };
  return parsed;
}

/**
 * Resolve an option document by page, variant and option indices.
 * @param {object} db Firestore database instance.
 * @param {{pageNumber: number, variantName: string, optionNumber: number}} info
 *   Location details.
 * @returns {Promise<string|null>} Option document path or null when not found.
 */
export async function findExistingOption(db, info) {
  if (!db || !info) {
    return null;
  }
  const pageSnap = await db
    .collectionGroup('pages')
    .where('number', '==', info.pageNumber)
    .limit(1)
    .get();
  if (pageSnap.empty) {
    return null;
  }
  const pageRef = pageSnap.docs[0].ref;
  const variantSnap = await pageRef
    .collection('variants')
    .where('name', '==', info.variantName)
    .limit(1)
    .get();
  if (variantSnap.empty) {
    return null;
  }
  const variantRef = variantSnap.docs[0].ref;
  const optionsSnap = await variantRef
    .collection('options')
    .where('position', '==', info.optionNumber)
    .limit(1)
    .get();
  if (optionsSnap.empty) {
    return null;
  }
  return optionsSnap.docs[0].ref.path;
}

/**
 * Resolve a page document that already has at least one variant.
 * @param {object} db Firestore database instance.
 * @param {number} pageNumber Page number to look up.
 * @returns {Promise<string|null>} Page document path or null when not found.
 */
export async function findExistingPage(db, pageNumber) {
  if (!db || !Number.isInteger(pageNumber)) {
    return null;
  }
  const pageSnap = await db
    .collectionGroup('pages')
    .where('number', '==', pageNumber)
    .limit(1)
    .get();
  if (pageSnap.empty) {
    return null;
  }
  const pageRef = pageSnap.docs[0].ref;
  const variantsSnap = await pageRef.collection('variants').limit(1).get();
  if (variantsSnap.empty) {
    return null;
  }
  return pageRef.path;
}
