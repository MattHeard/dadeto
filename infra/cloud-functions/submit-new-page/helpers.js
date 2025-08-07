/**
 * Parse a user supplied incoming option reference.
 * @param {string} str Raw option string.
 * @returns {{pageNumber: number, variantName: string, optionNumber: number}|null}
 *   Parsed info or null when invalid.
 */
export function parseIncomingOption(str) {
  console.log('[parseIncomingOption] str=%s', str);
  if (!str) {
    console.log('[parseIncomingOption] missing str');
    return null;
  }
  const parts = String(str)
    .split(/[^0-9a-zA-Z]+/)
    .filter(Boolean);
  if (parts.length !== 3) {
    console.log('[parseIncomingOption] invalid parts length=%d', parts.length);
    return null;
  }
  const [pageStr, variantName, optionStr] = parts;
  const pageNumber = Number.parseInt(pageStr, 10);
  const optionNumber = Number.parseInt(optionStr, 10);
  if (!Number.isInteger(pageNumber) || !Number.isInteger(optionNumber)) {
    console.log(
      '[parseIncomingOption] non-integer page or option pageStr=%s optionStr=%s',
      pageStr,
      optionStr
    );
    return null;
  }
  if (!variantName) {
    console.log('[parseIncomingOption] missing variantName');
    return null;
  }
  const parsed = { pageNumber, variantName, optionNumber };
  console.log(
    '[parseIncomingOption] parsed pageNumber=%d variantName=%s optionNumber=%d',
    pageNumber,
    variantName,
    optionNumber
  );
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
    .orderBy('createdAt')
    .limit(info.optionNumber + 1)
    .get();
  if (optionsSnap.size <= info.optionNumber) {
    return null;
  }
  return optionsSnap.docs[info.optionNumber].ref.path;
}
