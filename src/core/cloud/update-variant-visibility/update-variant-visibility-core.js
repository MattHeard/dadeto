import { getNumericValueOrZero } from '../cloud-core.js';

/**
 * Ensure the provided Firestore instance is truthy.
 * @param {import('firebase-admin/firestore').Firestore} db Firestore client.
 */
function assertDbExists(db) {
  if (!db) {
    throw new TypeError('db must expose a doc helper');
  }
}
/**
 * Ensure the provided Firestore instance has a doc method.
 * @param {import('firebase-admin/firestore').Firestore} db Firestore client.
 */
function assertDbHasDoc(db) {
  if (typeof db.doc !== 'function') {
    throw new TypeError('db must expose a doc helper');
  }
}

/**
 * Ensure the provided Firestore instance exposes the expected helpers.
 * @param {import('firebase-admin/firestore').Firestore} db Firestore client to validate.
 */
function assertDb(db) {
  assertDbExists(db);
  assertDbHasDoc(db);
}

/**
 * Validate that the supplied value behaves like a Firestore document snapshot.
 * @param {import('firebase-admin/firestore').DocumentSnapshot | null | undefined} snapshot Value to verify.
 * @returns {boolean} True when the snapshot exposes the Firestore getter API.
 */
function assertDocumentSnapshot(snapshot) {
  if (!snapshot) {
    return false;
  }
  return typeof snapshot.get === 'function';
}

/**
 * Extract the underlying data from a snapshot when it is available.
 * @param {import('firebase-admin/firestore').DocumentSnapshot | null | undefined} snapshot Snapshot returned by a trigger.
 * @returns {Record<string, unknown> | null} Stored document data, if present.
 */
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
 * Get a numeric property from an object safely.
 * @param {Record<string, unknown>} data Object to read from.
 * @param {string} key Property key.
 * @returns {number} Numeric value or 0.
 */
function getSafeNumber(data, key) {
  return getNumericValueOrZero(data, record => record?.[key]);
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
  const currentVisibility = getSafeNumber(variantData, 'visibility');
  const currentCount = getSafeNumber(variantData, 'moderationRatingCount');
  const currentReputationSum = getSafeNumber(
    variantData,
    'moderatorReputationSum'
  );

  const numerator = currentVisibility * currentReputationSum + newRating;
  const denominator = currentCount + 1;

  return safeDivide(numerator, denominator);
}

/**
 * Divide two numbers, returning 0 if the denominator is 0.
 * @param {number} numerator Numerator.
 * @param {number} denominator Denominator.
 * @returns {number} Result of division.
 */
function safeDivide(numerator, denominator) {
  if (denominator === 0) {
    return 0;
  }
  return numerator / denominator;
}

/**
 * Determine the new rating based on approval status.
 * @param {boolean} isApproved Whether the variant is approved.
 * @returns {number} 1 if approved, 0 otherwise.
 */
function getNewRating(isApproved) {
  if (isApproved) {
    return 1;
  }
  return 0;
}

/**
 * Check if the approval status is valid.
 * @param {unknown} isApproved Approval status.
 * @returns {boolean} True if boolean.
 */
function isValidApproval(isApproved) {
  return typeof isApproved === 'boolean';
}

/**
 * Update the variant document with new stats.
 * @param {import('firebase-admin/firestore').DocumentReference} ref Document reference.
 * @param {{ visibility: number, count: number, reputation: number }} stats New stats.
 * @returns {Promise<void>} Promise.
 */
async function updateVariantStats(ref, { visibility, count, reputation }) {
  await ref.update({
    visibility,
    moderatorRatingCount: count,
    moderatorReputationSum: reputation,
  });
}

/**
 * Calculate new stats from data and rating.
 * @param {Record<string, unknown>} variantData Variant data.
 * @param {number} newRating New rating.
 * @returns {{ visibility: number, count: number, reputation: number }} New stats.
 */
function calculateNewStats(variantData, newRating) {
  const updatedVisibility = calculateUpdatedVisibility(variantData, newRating);
  const moderationRatingCount = getSafeNumber(
    variantData,
    'moderationRatingCount'
  );
  const moderatorReputationSum = getSafeNumber(
    variantData,
    'moderatorReputationSum'
  );

  return {
    visibility: updatedVisibility,
    count: moderationRatingCount + 1,
    reputation: moderatorReputationSum + 1,
  };
}

/**
 * Check if snapshot is valid and exists.
 * @param {import('firebase-admin/firestore').DocumentSnapshot} snapshot Snapshot.
 * @returns {boolean} True if valid.
 */
function isValidSnapshot(snapshot) {
  if (!assertDocumentSnapshot(snapshot)) {
    return false;
  }
  return snapshot.exists;
}

/**
 * Process the variant update if the snapshot is valid.
 * @param {import('firebase-admin/firestore').DocumentSnapshot} variantSnap Variant snapshot.
 * @param {import('firebase-admin/firestore').DocumentReference} variantRef Variant reference.
 * @param {boolean} isApproved Approval status.
 * @returns {Promise<void>} Promise.
 */
async function processVariantUpdate(variantSnap, variantRef, isApproved) {
  if (!isValidSnapshot(variantSnap)) {
    return;
  }

  const variantData = variantSnap.data();
  const newRating = getNewRating(isApproved);
  const newStats = calculateNewStats(variantData, newRating);

  await updateVariantStats(variantRef, newStats);
}

/**
 * Validate approval status.
 * @param {unknown} isApproved Approval status.
 * @returns {boolean} True if valid.
 */
function validateApproval(isApproved) {
  return isValidApproval(isApproved);
}

/**
 * Resolve variant path and reference.
 * @param {import('firebase-admin/firestore').Firestore} db Firestore.
 * @param {string} variantId Variant ID.
 * @returns {import('firebase-admin/firestore').DocumentReference | null} Reference or null.
 */
function resolveVariantRef(db, variantId) {
  const normalizedVariantPath = normalizeVariantPath(variantId);

  if (!normalizedVariantPath) {
    return null;
  }
  return db.doc(normalizedVariantPath);
}

/**
 * Validate inputs and resolve reference.
 * @param {import('firebase-admin/firestore').Firestore} db Firestore.
 * @param {string} variantId Variant ID.
 * @param {unknown} isApproved Approval status.
 * @returns {import('firebase-admin/firestore').DocumentReference | null} Reference or null.
 */
function validateAndResolve(db, variantId, isApproved) {
  if (!validateApproval(isApproved)) {
    return null;
  }
  return resolveVariantRef(db, variantId);
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
    const { variantId, isApproved } = data;

    const variantRef = validateAndResolve(db, variantId, isApproved);
    if (!variantRef) {
      return null;
    }

    const variantSnap = await variantRef.get();
    await processVariantUpdate(variantSnap, variantRef, isApproved);

    return null;
  };
}
