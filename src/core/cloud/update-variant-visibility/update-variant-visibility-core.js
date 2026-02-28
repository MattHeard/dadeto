import { getNumericValueOrZero } from '../cloud-core.js';
import { when } from '../../commonCore.js';

/**
 * @typedef {object} VariantUpdatePayload
 * @property {string} variantId Variant identifier.
 * @property {boolean} isApproved Approval status.
 */

/**
 * @typedef {object} VariantStats
 * @property {number} visibility Visibility score.
 * @property {number} count Moderation rating count.
 * @property {number} reputation Moderator reputation sum.
 */

/**
 * Validate a Firestore client using the provided predicate.
 * @param {import('firebase-admin/firestore').Firestore} db Firestore client.
 * @param {(candidate: import('firebase-admin/firestore').Firestore) => boolean} predicate Validation predicate.
 * @returns {void}
 */
function assertDbCondition(db, predicate) {
  if (!predicate(db)) {
    throw new TypeError('db must expose a doc helper');
  }
}

/**
 * Ensure the provided Firestore instance is truthy.
 * @param {import('firebase-admin/firestore').Firestore} db Firestore client.
 */
function assertDbExists(db) {
  assertDbCondition(db, Boolean);
}

/**
 * Ensure the provided Firestore instance has a doc method.
 * @param {import('firebase-admin/firestore').Firestore} db Firestore client.
 */
function assertDbHasDoc(db) {
  assertDbCondition(db, candidate => typeof candidate?.doc === 'function');
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
 * Read the moderator reputation total when the data exists.
 * @param {Record<string, unknown>} variantData Variant data to read.
 * @returns {number} Reputation sum or zero when unavailable.
 */
function getModeratorReputationSum(variantData) {
  return getSafeNumber(variantData, 'moderatorReputationSum');
}

/**
 * Calculate the updated visibility score based on the new rating.
 * @param {Record<string, unknown>} variantData Existing variant state.
 * @param {number} newRating Numeric representation of the latest rating.
 * @returns {number} Updated visibility score.
 */
export function calculateUpdatedVisibility(variantData, newRating) {
  const currentVisibility = getSafeNumber(variantData, 'visibility');
  const currentCount = getSafeNumber(variantData, 'moderationRatingCount');
  const currentReputationSum = getModeratorReputationSum(variantData);

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
 * @param {VariantStats} stats New stats.
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
 * @returns {VariantStats} New stats.
 */
function calculateNewStats(variantData, newRating) {
  const updatedVisibility = calculateUpdatedVisibility(variantData, newRating);
  const moderationRatingCount = getSafeNumber(
    variantData,
    'moderationRatingCount'
  );
  const moderatorReputationSum = getModeratorReputationSum(variantData);

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
 * Read document data when the snapshot is valid.
 * @param {import('firebase-admin/firestore').DocumentSnapshot} snapshot Variant snapshot.
 * @returns {Record<string, unknown> | null} Data or null when invalid.
 */
function getValidVariantSnapshotData(snapshot) {
  if (!isValidSnapshot(snapshot)) {
    return null;
  }

  return getSnapshotDataOrFallback(snapshot);
}

/**
 * Normalize snapshot data to an object, treating absence as empty.
 * @param {import('firebase-admin/firestore').DocumentSnapshot} snapshot Snapshot to read.
 * @returns {Record<string, unknown>} Snapshot data or empty object.
 */
function getSnapshotDataOrFallback(snapshot) {
  const snapshotData = snapshot.data();
  if (snapshotData) {
    return snapshotData;
  }

  return {};
}

/**
 * Process the variant update if the snapshot is valid.
 * @param {import('firebase-admin/firestore').DocumentSnapshot} variantSnap Variant snapshot.
 * @param {import('firebase-admin/firestore').DocumentReference} variantRef Variant reference.
 * @param {boolean} isApproved Approval status.
 * @returns {Promise<void>} Promise.
 */
async function processVariantUpdate(variantSnap, variantRef, isApproved) {
  const variantData = getValidVariantSnapshotData(variantSnap);
  if (!variantData) {
    return;
  }

  const newStats = calculateNewStats(variantData, getNewRating(isApproved));

  await updateVariantStats(variantRef, newStats);
}

/**
 * Validate approval status.
 * @param {unknown} isApproved Approval status.
 * @returns {isApproved is boolean} True if valid.
 */
function validateApproval(isApproved) {
  return isValidApproval(isApproved);
}

/**
 * Extracts validated variant update inputs.
 * @param {Record<string, unknown>} data Raw trigger payload.
 * @returns {VariantUpdatePayload | null} Sanitized payload for processing.
 */
function getValidVariantUpdatePayload(data) {
  if (typeof data.variantId !== 'string') {
    return null;
  }

  return buildVariantUpdatePayload(data.variantId, data.isApproved);
}

/**
 * Build the final payload when approval status is valid.
 * @param {string} variantId Variant identifier.
 * @param {unknown} isApproved Approval flag.
 * @returns {VariantUpdatePayload | null} Payload for processing.
 */
function buildVariantUpdatePayload(variantId, isApproved) {
  return /** @type {VariantUpdatePayload | null} */ (
    when(validateApproval(isApproved), () => ({
      variantId,
      isApproved: /** @type {boolean} */ (isApproved),
    }))
  );
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
 * Build the handler that updates variant visibility.
 * @param {{ db: import('firebase-admin/firestore').Firestore }} options Collaborators required by the handler.
 * @returns {(snap: import('firebase-admin/firestore').DocumentSnapshot) => Promise<null>} Firestore trigger handler.
 */
export function createUpdateVariantVisibilityHandler({ db }) {
  assertDb(db);

  return async function handleUpdateVariantVisibility(snapshot) {
    return executeVariantUpdate(db, snapshot);
  };
}

/**
 * Execute the variant update logic when a valid payload exists.
 * @param {import('firebase-admin/firestore').Firestore} db Firestore client.
 * @param {import('firebase-admin/firestore').DocumentSnapshot} snapshot Trigger snapshot.
 * @returns {Promise<null>} Resolves with null when complete.
 */
async function executeVariantUpdate(db, snapshot) {
  const payload = getVariantUpdatePayloadFromSnapshot(snapshot);
  if (!payload) {
    return null;
  }

  return applyVariantUpdate(db, payload);
}

/**
 * Apply the visibility update using the validated payload.
 * @param {import('firebase-admin/firestore').Firestore} db Firestore client.
 * @param {{ variantId: string; isApproved: boolean }} payload Validated inputs.
 * @returns {Promise<null>} Resolves after the update runs.
 */
async function applyVariantUpdate(db, payload) {
  const variantRef = resolveVariantRef(db, payload.variantId);
  return when(
    Boolean(variantRef),
    async () => {
      const variantSnap = await variantRef.get();
      await processVariantUpdate(variantSnap, variantRef, payload.isApproved);

      return null;
    },
    () => null
  );
}

/**
 * Extracts a sanitized payload directly from the snapshot.
 * @param {import('firebase-admin/firestore').DocumentSnapshot} snapshot Firestore snapshot.
 * @returns {VariantUpdatePayload | null} Validated payload or null.
 */
function getVariantUpdatePayloadFromSnapshot(snapshot) {
  const data = snapshot.data();
  if (!data) {
    return null;
  }

  return getValidVariantUpdatePayload(data);
}
