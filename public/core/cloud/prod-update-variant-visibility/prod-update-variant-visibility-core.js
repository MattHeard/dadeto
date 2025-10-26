function assertDb(db) {
  if (!db || typeof db.doc !== 'function') {
    throw new TypeError('db must expose a doc helper');
  }
}

function assertDocumentSnapshot(snapshot) {
  return snapshot && typeof snapshot.get === 'function';
}

function getSnapshotData(snapshot) {
  if (!snapshot || typeof snapshot.data !== 'function') {
    return null;
  }

  return snapshot.data();
}

function toNumber(value) {
  return typeof value === 'number' ? value : 0;
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
 * Build the handler that updates variant visibility in production.
 * @param {object} options Collaborators required by the handler.
 * @param {import('firebase-admin/firestore').Firestore} options.db Firestore instance.
 * @returns {(snap: *) => Promise<null>} Firestore trigger handler.
 */
export function createProdUpdateVariantVisibilityHandler({ db }) {
  assertDb(db);

  return async function handleProdUpdateVariantVisibility(snapshot) {
    const data = getSnapshotData(snapshot) ?? {};
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

    const variantData = variantSnap.data() ?? {};
    const newRating = isApproved ? 1 : 0;

    const updatedVisibility = calculateUpdatedVisibility(variantData, newRating);
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
