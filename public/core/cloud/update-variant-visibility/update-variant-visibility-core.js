/**
 * Ensure the provided Firestore instance exposes the expected helpers.
 * @param {import('firebase-admin/firestore').Firestore} db Firestore client to validate.
 */
function assertDb(db) {
  if (!db || typeof db.doc !== 'function') {
    throw new TypeError('db must expose a doc helper');
  }
}

/**
 * Validate that the supplied value behaves like a Firestore document snapshot.
 * @param {import('firebase-admin/firestore').DocumentSnapshot | null | undefined} snapshot Value to verify.
 * @returns {boolean} True when the snapshot exposes the Firestore getter API.
 */
function assertDocumentSnapshot(snapshot) {
  return Boolean(snapshot && typeof snapshot.get === 'function');
}

/**
 * Extract the underlying data from a snapshot when it is available.
 * @param {import('firebase-admin/firestore').DocumentSnapshot | null | undefined} snapshot Snapshot returned by a trigger.
 * @returns {Record<string, unknown> | null} Stored document data, if present.
 */
/**
 * Cast nullable numeric values into a usable number for calculations.
 * @param {number | null | undefined} value Possible numeric input.
 * @returns {number} Normalized number, defaulting to zero when absent.
 */
function toNumber(value) {
  if (typeof value === 'number') {
    return value;
  }
  return 0;
}

/**
 * Normalize a variant identifier into a Firestore document path.
 * @param {string | null | undefined} variantId Raw variant identifier.
 * @returns {string} Cleaned variant path without a leading slash.
 */
export function normalizeVariantPath(variantId) {
  if (typeof variantId !== 'string') {
    return '';
  }

  return variantId.replace(/^\//, '').trim();
}

/**
 * Calculate the updated visibility score based on the new rating.
 * @param {{
 *   visibility?: number,
 *   moderationRatingCount?: number,
 *   moderatorReputationSum?: number,
 * }} variantData Existing variant state.
 * @param {number} newRating Numeric representation of the latest rating.
 * @returns {number} Updated visibility score.
 */
export function calculateUpdatedVisibility(variantData, newRating) {
  const currentVisibility = toNumber(variantData?.visibility);
  const currentCount = toNumber(variantData?.moderationRatingCount);
  const currentReputationSum = toNumber(variantData?.moderatorReputationSum);

  const numerator = currentVisibility * currentReputationSum + newRating;
  const denominator = currentCount + 1;

  if (denominator === 0) {
    return 0;
  }

  return numerator / denominator;
}

/**
 * Build the handler that updates variant visibility.
 * @param {{ db: import('firebase-admin/firestore').Firestore }} options Collaborators required by the handler.
 * @returns {(snap: import('firebase-admin/firestore').DocumentSnapshot) => Promise<null>} Firestore trigger handler.
 */
export function createUpdateVariantVisibilityHandler({ db }) {
  assertDb(db);

  return async function handleUpdateVariantVisibility(snapshot) {
    const data = snapshot.data();
    const variantId = data.variantId;
    const isApproved = data.isApproved;

    if (typeof isApproved !== 'boolean') {
      return null;
    }

    const normalizedVariantPath = normalizeVariantPath(variantId);

    if (!normalizedVariantPath) {
      return null;
    }

    const variantRef = db.doc(normalizedVariantPath);
    const variantSnap = await variantRef.get();

    if (!assertDocumentSnapshot(variantSnap) || !variantSnap.exists) {
      return null;
    }

    const variantData = variantSnap.data();
    let newRating;
    if (isApproved) {
      newRating = 1;
    } else {
      newRating = 0;
    }

    const updatedVisibility = calculateUpdatedVisibility(
      variantData,
      newRating
    );
    const moderationRatingCount = toNumber(variantData.moderationRatingCount);
    const moderatorReputationSum = toNumber(variantData.moderatorReputationSum);

    await variantRef.update({
      visibility: updatedVisibility,
      moderatorRatingCount: moderationRatingCount + 1,
      moderatorReputationSum: moderatorReputationSum + 1,
    });

    return null;
  };
}
