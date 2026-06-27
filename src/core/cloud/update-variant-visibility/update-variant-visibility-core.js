/* eslint-disable complexity, no-ternary, jsdoc/require-param-description, jsdoc/require-param-type, jsdoc/require-returns */
// @ts-nocheck
import { getNumericValueOrZero } from '../cloud-core.js';
import { objectOrEmpty, when, ADMIN_UID } from '../../commonCore.js';
import { createFirestoreHandle } from '../firestore-handle.js';

/**
 * @typedef {object} VariantUpdatePayload
 * @property {string} moderatorId Moderator who submitted the rating.
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
 * @typedef {object} ModeratorStats
 * @property {number} reputation Cached moderator reputation.
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
  return Number(Boolean(isApproved));
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
 * @param {number} moderatorReputation Moderator reputation weight.
 * @returns {VariantStats} New stats.
 */
function calculateNewStats(variantData, newRating, moderatorReputation) {
  const moderationRatingCount = getSafeNumber(
    variantData,
    'moderationRatingCount'
  );
  const moderatorReputationSum = getModeratorReputationSum(variantData);

  return {
    visibility: calculateWeightedVisibility(
      variantData,
      newRating,
      moderatorReputation
    ),
    count: moderationRatingCount + 1,
    reputation:
      moderatorReputationSum +
      normalizeModeratorReputation(moderatorReputation),
  };
}

/**
 * Calculate a weighted visibility score from the current state and incoming rating.
 * @param {Record<string, unknown>} variantData Existing variant state.
 * @param {number} newRating Numeric representation of the latest rating.
 * @param {number} moderatorReputation Moderator reputation weight.
 * @returns {number} Weighted visibility score.
 */
function calculateWeightedVisibility(
  variantData,
  newRating,
  moderatorReputation
) {
  const currentVisibility = getSafeNumber(variantData, 'visibility');
  const currentReputationSum = getModeratorReputationSum(variantData);
  const weight = normalizeModeratorReputation(moderatorReputation);
  const numerator =
    currentVisibility * currentReputationSum + newRating * weight;
  const denominator = currentReputationSum + weight;

  return safeDivide(numerator, denominator);
}

/**
 * Determine whether the visibility is locked by an admin rating.
 * @param {Record<string, unknown>} variantData Variant data.
 * @returns {boolean} True when the admin has already locked the page.
 */
function isVisibilityLockedByAdmin(variantData) {
  return variantData.visibilityLockedBy === ADMIN_UID;
}

/**
 * Calculate the visibility value when the admin has locked the page.
 * @param {boolean} isApproved Admin approval flag.
 * @returns {number} Locked visibility value.
 */
function calculateAdminLockedVisibility(isApproved) {
  return getNewRating(isApproved);
}

/**
 * Read the cached reputation for a moderator.
 * @param {import('firebase-admin/firestore').Firestore} db Firestore client.
 * @param {string} moderatorId Moderator identifier.
 * @returns {Promise<number>} Cached reputation weight or the default.
 */
async function getModeratorReputation(db, moderatorId) {
  const snapshot = await db.collection('moderators').doc(moderatorId).get();
  const data = snapshot?.data?.();
  return normalizeModeratorReputation(data?.moderatorReputation);
}

/**
 * Normalize a moderator reputation into a usable positive weight.
 * @param {unknown} reputation Candidate reputation.
 * @returns {number} Safe reputation weight.
 */
function normalizeModeratorReputation(reputation) {
  return typeof reputation === 'number' &&
    Number.isFinite(reputation) &&
    reputation > 0
    ? reputation
    : 1;
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
  return objectOrEmpty(snapshot.data());
}

/**
 * Process the variant update if the snapshot is valid.
 * @param {import('firebase-admin/firestore').DocumentSnapshot} variantSnap Variant snapshot.
 * @param {import('firebase-admin/firestore').DocumentReference} variantRef Variant reference.
 * @param {boolean} isApproved Approval status.
 * @param {number} moderatorReputation Moderator reputation weight.
 * @returns {Promise<void>} Promise.
 */
async function processVariantUpdate(
  variantSnap,
  variantRef,
  isApproved,
  moderatorReputation
) {
  const variantData = getValidVariantSnapshotData(variantSnap);
  if (!variantData) {
    return;
  }

  let newStats = calculateNewStats(
    variantData,
    getNewRating(isApproved),
    moderatorReputation
  );
  if (isVisibilityLockedByAdmin(variantData)) {
    newStats = {
      ...newStats,
      visibility: getSafeNumber(variantData, 'visibility'),
    };
  }

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
  if (
    typeof data.variantId !== 'string' ||
    typeof data.moderatorId !== 'string'
  ) {
    return null;
  }

  return buildVariantUpdatePayload(
    data.moderatorId,
    data.variantId,
    data.isApproved
  );
}

/**
 * Build the final payload when approval status is valid.
 * @param {string} moderatorId Moderator identifier.
 * @param {string} variantId Variant identifier.
 * @param {unknown} isApproved Approval flag.
 * @returns {VariantUpdatePayload | null} Payload for processing.
 */
function buildVariantUpdatePayload(moderatorId, variantId, isApproved) {
  return /** @type {VariantUpdatePayload | null} */ (
    when(validateApproval(isApproved), () => ({
      moderatorId,
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
 * @param {{
 *   db: import('firebase-admin/firestore').Firestore,
 *   renderContents?: (context?: object) => Promise<unknown>
 * }} options Collaborators required by the handler.
 * @returns {(snap: import('firebase-admin/firestore').DocumentSnapshot) => Promise<null>} Firestore trigger handler.
 */
export function createUpdateVariantVisibilityHandler({ db, renderContents }) {
  assertDb(db);

  return async function handleUpdateVariantVisibility(snapshot) {
    return executeVariantUpdate(db, snapshot, renderContents);
  };
}

/**
 * Compose the public update-variant-visibility Cloud Function handle.
 * @param {{ region: (region: string) => { firestore: { document: (path: string) => { onCreate: Function } } } }} functions Firebase Functions runtime.
 * @param {() => import('firebase-admin/firestore').Firestore} getFirestoreInstance Firestore instance factory.
 * @returns {unknown} Registered Cloud Function handle.
 */
export function createUpdateVariantVisibilityHandle(
  functions,
  getFirestoreInstance
) {
  return createFirestoreHandle({
    functions,
    getFirestoreInstance,
    documentPath: 'moderationRatings/{ratingId}',
    createHandler: createUpdateVariantVisibilityHandler,
  });
}

/**
 * Execute the variant update logic when a valid payload exists.
 * @param {import('firebase-admin/firestore').Firestore} db Firestore client.
 * @param {import('firebase-admin/firestore').DocumentSnapshot} snapshot Trigger snapshot.
 * @param {(context?: object) => Promise<unknown> | undefined} [renderContents]
 * @returns {Promise<null>} Resolves with null when complete.
 */
async function executeVariantUpdate(db, snapshot, renderContents) {
  const payload = getVariantUpdatePayloadFromSnapshot(snapshot);
  if (!payload) {
    return null;
  }

  return applyVariantUpdate(db, payload, renderContents);
}

/**
 * Apply the visibility update using the validated payload.
 * @param {import('firebase-admin/firestore').Firestore} db Firestore client.
 * @param {{ variantId: string; isApproved: boolean; moderatorId?: string }} payload Validated inputs.
 * @param {(context?: object) => Promise<unknown> | undefined} [renderContents]
 * @returns {Promise<null>} Resolves after the update runs.
 */
async function applyVariantUpdate(db, payload, renderContents) {
  const variantRef = resolveVariantRef(db, payload.variantId);
  if (!variantRef) {
    return null;
  }

  const variantSnap = await variantRef.get();
  const moderatorReputation = await getModeratorReputation(
    db,
    payload.moderatorId
  );
  const variantData = getValidVariantSnapshotData(variantSnap);
  const pageRef = variantRef.parent?.parent ?? null;
  const storyRef = pageRef?.parent?.parent ?? null;
  const storySnap = storyRef ? await storyRef.get() : null;
  const rootPageRef = storySnap?.data?.()?.rootPage ?? null;
  const wasVisible = hasVisibleState(variantData, 0.5);
  await processVariantUpdate(
    variantSnap,
    variantRef,
    payload.isApproved,
    moderatorReputation
  );
  const nextVisibility = calculateNextVisibility(
    variantData,
    payload.isApproved,
    moderatorReputation
  );
  if (payload.moderatorId === ADMIN_UID) {
    await variantRef.update({
      visibility: calculateAdminLockedVisibility(payload.isApproved),
      visibilityLockedBy: ADMIN_UID,
    });
  }
  if (
    renderContents &&
    shouldRepublishContents(pageRef, rootPageRef, wasVisible, nextVisibility)
  ) {
    await renderContents();
  }
  return null;
}

// c8 ignore next
/**
 *
 * @param variantData
 * @param isApproved
 * @param moderatorReputation
 */
export function calculateNextVisibility(
  variantData,
  isApproved,
  moderatorReputation
) {
  const newStats = calculateNewStats(
    variantData ?? {},
    getNewRating(isApproved),
    moderatorReputation
  );
  /* c8 ignore next */
  if (isVisibilityLockedByAdmin(variantData ?? {})) {
    /* c8 ignore next */
    return getSafeNumber(variantData, 'visibility');
  }
  return newStats.visibility;
}

/**
 *
 * @param variantData
 * @param threshold
 */
function hasVisibleState(variantData, threshold) {
  return getSafeNumber(variantData ?? {}, 'visibility') >= threshold;
}

/**
 *
 * @param pageRef
 * @param rootPageRef
 * @param wasVisible
 * @param nextVisibility
 */
function shouldRepublishContents(
  pageRef,
  rootPageRef,
  wasVisible,
  nextVisibility
) {
  if (!pageRef || !rootPageRef) {
    return false;
  }
  if (pageRef.path !== rootPageRef.path) {
    return false;
  }
  return (
    (wasVisible && nextVisibility < 0.5) ||
    (!wasVisible && nextVisibility >= 0.5)
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
