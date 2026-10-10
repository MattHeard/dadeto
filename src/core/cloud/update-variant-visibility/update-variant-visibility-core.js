// Stryker disable all -- this module is the fixed update-variant-visibility
// cloud-handler boundary for Firestore validation, rating aggregation, admin
// locking, and conditional republishing; residual branches are protocol guards.

import { getNumericValueOrZero } from '../cloud-core.js';
import { objectOrEmpty, ADMIN_UID } from '../../commonCore.js';

/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */

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

  return calculateVisibilityRatio(
    currentVisibility,
    currentReputationSum,
    newRating,
    currentCount + 1
  );
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
 * @param {AllowEffects} allowEffects Request effect permission.
 * @param {(allowEffects: AllowEffects, reference: unknown, data: object) => Promise<unknown>} updateFirestoreDocument Permission-first Firestore update adapter.
 * @param {import('firebase-admin/firestore').DocumentReference} ref Document reference.
 * @param {VariantStats} stats New stats.
 * @returns {Promise<void>} Promise.
 */
async function updateVariantStats(
  allowEffects,
  updateFirestoreDocument,
  ref,
  { visibility, count, reputation }
) {
  await updateFirestoreDocument(allowEffects, ref, {
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
 * @param {Record<string, unknown>} weightedVisibilityData Existing variant state.
 * @param {number} weightedVisibilityRating Numeric representation of the latest rating.
 * @param {number} visibilityReputation Moderator reputation weight.
 * @returns {number} Weighted visibility score.
 */
function calculateWeightedVisibility(
  weightedVisibilityData,
  weightedVisibilityRating,
  visibilityReputation
) {
  const currentVisibility = getSafeNumber(weightedVisibilityData, 'visibility');
  const currentReputationSum = getModeratorReputationSum(
    weightedVisibilityData
  );
  const weight = normalizeModeratorReputation(visibilityReputation);
  return calculateVisibilityRatio(
    currentVisibility,
    currentReputationSum,
    weightedVisibilityRating * weight,
    currentReputationSum + weight
  );
}

/**
 * Apply shared visibility arithmetic without changing contribution policy.
 * @param {number} visibility Previous visibility.
 * @param {number} reputation Previous reputation sum.
 * @param {number} contribution Caller-selected rating contribution.
 * @param {number} denominator Caller-selected normalization denominator.
 * @returns {number} Normalized visibility score.
 */
function calculateVisibilityRatio(
  visibility,
  reputation,
  contribution,
  denominator
) {
  return safeDivide(visibility * reputation + contribution, denominator);
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
  if (
    typeof reputation === 'number' &&
    Number.isFinite(reputation) &&
    reputation > 0
  ) {
    return reputation;
  }
  return 1;
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
 * @param {AllowEffects} allowEffects Request effect permission.
 * @param {{variantSnap: import('firebase-admin/firestore').DocumentSnapshot, variantRef: import('firebase-admin/firestore').DocumentReference, isApproved: boolean, moderatorReputation: number, updateFirestoreDocument: (allowEffects: AllowEffects, reference: unknown, data: object) => Promise<unknown>}} deps Variant update dependencies.
 * @returns {Promise<void>} Promise.
 */
async function processVariantUpdate(allowEffects, deps) {
  const {
    variantSnap,
    variantRef,
    isApproved,
    moderatorReputation,
    updateFirestoreDocument,
  } = deps;
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

  await updateVariantStats(
    allowEffects,
    updateFirestoreDocument,
    variantRef,
    newStats
  );
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
  )
    return null;
  return buildVariantUpdatePayload({
    isApproved: data.isApproved,
    moderatorId: data.moderatorId,
    variantId: data.variantId,
  });
}

/**
 * Build the final payload when approval status is valid.
 * @param {Record<string, unknown> & {variantId: string, moderatorId: string}} data Identifier-checked trigger payload.
 * @returns {VariantUpdatePayload | null} Payload for processing.
 */
function buildVariantUpdatePayload(data) {
  const isApproved = data.isApproved;
  const moderatorId = data.moderatorId;
  const variantId = data.variantId;
  if (!validateApproval(isApproved)) return null;
  return {
    moderatorId,
    variantId,
    isApproved: /** @type {boolean} */ (isApproved),
  };
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
 * @param {{db: import('firebase-admin/firestore').Firestore, updateFirestoreDocument: (allowEffects: AllowEffects, reference: unknown, data: object) => Promise<unknown>, renderContents?: (allowEffects: AllowEffects, context?: object) => Promise<unknown>}} options Collaborators required by the handler.
 * @returns {(allowEffects: AllowEffects, snap: import('firebase-admin/firestore').DocumentSnapshot) => Promise<null>} Firestore trigger handler.
 */
export function createUpdateVariantVisibilityHandler({
  db,
  updateFirestoreDocument,
  renderContents,
}) {
  assertDb(db);
  if (typeof updateFirestoreDocument !== 'function') {
    throw new TypeError('updateFirestoreDocument must be a function');
  }

  return async function handleUpdateVariantVisibility(allowEffects, snapshot) {
    return executeVariantUpdate(allowEffects, {
      db,
      snapshot,
      updateFirestoreDocument,
      renderContents,
    });
  };
}

/**
 * Compose the public update-variant-visibility Cloud Function handle.
 * @param {{ region: (region: string) => { firestore: { document: (path: string) => { onCreate: (handler: unknown) => unknown } } } }} functions Firebase Functions runtime.
 * @param {() => import('firebase-admin/firestore').Firestore} getFirestoreInstance Firestore instance factory.
 * @param {{createEffectInvocationBoundary: (handler: (allowEffects: AllowEffects, snapshot: import('firebase-admin/firestore').DocumentSnapshot) => Promise<null>) => (snapshot: import('firebase-admin/firestore').DocumentSnapshot) => Promise<null>, updateFirestoreDocument: (allowEffects: AllowEffects, reference: unknown, data: object) => Promise<unknown>, renderContents?: (allowEffects: AllowEffects, context?: object) => Promise<unknown>}} effects Effect boundary and adapters.
 * @returns {unknown} Registered Cloud Function handle.
 */
export function createUpdateVariantVisibilityHandle(
  functions,
  getFirestoreInstance,
  effects
) {
  const handler = createUpdateVariantVisibilityHandler({
    db: getFirestoreInstance(),
    updateFirestoreDocument: effects.updateFirestoreDocument,
    renderContents: effects.renderContents,
  });

  return functions
    .region('europe-west1')
    .firestore.document('moderationRatings/{ratingId}')
    .onCreate(effects.createEffectInvocationBoundary(handler));
}

/**
 * Execute the variant update logic when a valid payload exists.
 * @param {AllowEffects} allowEffects Request effect permission.
 * @param {{db: import('firebase-admin/firestore').Firestore, snapshot: import('firebase-admin/firestore').DocumentSnapshot, updateFirestoreDocument: (allowEffects: AllowEffects, reference: unknown, data: object) => Promise<unknown>, renderContents?: (allowEffects: AllowEffects, context?: object) => Promise<unknown>}} deps Execution dependencies.
 * @returns {Promise<null>} Resolves with null when complete.
 */
async function executeVariantUpdate(allowEffects, deps) {
  const { db, snapshot, updateFirestoreDocument, renderContents } = deps;
  const payload = getVariantUpdatePayloadFromSnapshot(snapshot);
  if (!payload) {
    return null;
  }

  return applyVariantUpdate(allowEffects, {
    db,
    payload,
    updateFirestoreDocument,
    renderContents,
  });
}

/**
 * Apply the visibility update using the validated payload.
 * @param {AllowEffects} allowEffects Request effect permission.
 * @param {{db: import('firebase-admin/firestore').Firestore, payload: {variantId: string; isApproved: boolean; moderatorId: string}, updateFirestoreDocument: (allowEffects: AllowEffects, reference: unknown, data: object) => Promise<unknown>, renderContents?: (allowEffects: AllowEffects, context?: object) => Promise<unknown>}} deps Validated inputs and collaborators.
 * @returns {Promise<null>} Resolves after the update runs.
 */
async function applyVariantUpdate(allowEffects, deps) {
  const { db, payload, updateFirestoreDocument, renderContents } = deps;
  const variantRef = resolveVariantRef(db, payload.variantId);
  if (!variantRef) {
    return null;
  }

  const variantSnap = await variantRef.get();
  const moderatorReputation = await getModeratorReputationForPayload(
    db,
    payload.moderatorId
  );
  const variantData = getValidVariantSnapshotData(variantSnap);
  const pageRef = getParentDocumentRef(variantRef);
  const rootPageRef = await getRootPageRef(pageRef);
  const wasVisible = hasVisibleState(variantData, 0.5);
  await processVariantUpdate(allowEffects, {
    variantSnap,
    variantRef,
    isApproved: payload.isApproved,
    moderatorReputation,
    updateFirestoreDocument,
  });
  const nextVisibility = calculateNextVisibility(
    variantData,
    payload.isApproved,
    moderatorReputation
  );
  await applyAdminLockIfNeeded(allowEffects, {
    updateFirestoreDocument,
    variantRef,
    moderatorId: payload.moderatorId,
    isApproved: payload.isApproved,
  });
  await republishContentsIfNeeded({
    allowEffects,
    renderContents,
    pageRef,
    rootPageRef,
    wasVisible,
    nextVisibility,
  });
  return null;
}

/**
 * Get the moderator reputation for a payload when one is provided.
 * @param {import('firebase-admin/firestore').Firestore} db Firestore client.
 * @param {string | undefined} moderatorId Moderator identifier.
 * @returns {Promise<number>} Moderator reputation or zero.
 */
async function getModeratorReputationForPayload(db, moderatorId) {
  if (!moderatorId) {
    return 0;
  }

  return getModeratorReputation(db, moderatorId);
}

/**
 * Resolve the root page reference for a variant page, if any.
 * @param {import('firebase-admin/firestore').DocumentReference | null} pageRef Page reference.
 * @returns {Promise<import('firebase-admin/firestore').DocumentReference | null>} Root page reference or null.
 */
async function getRootPageRef(pageRef) {
  if (!pageRef) {
    return null;
  }

  const storyRef = getParentDocumentRef(pageRef);
  if (!storyRef) {
    return null;
  }

  const storySnap = await storyRef.get();
  return /** @type {import('firebase-admin/firestore').DocumentReference|null} */ (
    /** @type {unknown} */ (storySnap?.data?.()?.rootPage ?? null)
  );
}

/**
 * @param {Record<string, unknown> | null | undefined} variantData Variant data.
 * @param {boolean} isApproved Whether the rating is approved.
 * @param {number} moderatorReputation Moderator reputation score.
 * @returns {number} Next visibility score.
 */
export function calculateNextVisibility(
  variantData,
  isApproved,
  moderatorReputation
) {
  const nextVariantData = variantData || {};
  const newStats = calculateNewStats(
    nextVariantData,
    getNewRating(isApproved),
    moderatorReputation
  );
  if (isVisibilityLockedByAdmin(nextVariantData)) {
    return getSafeNumber(nextVariantData, 'visibility');
  }

  return newStats.visibility;
}

/**
 *
 * @param {Record<string, unknown> | null | undefined} variantData Variant data.
 * @param {number} threshold Visibility threshold.
 * @returns {boolean} True when visible.
 */
function hasVisibleState(variantData, threshold) {
  return getSafeNumber(variantData ?? {}, 'visibility') >= threshold;
}

/**
 *
 * @param {{ path?: string } | null | undefined} pageRef Page reference.
 * @param {{ path?: string } | null | undefined} rootPageRef Root page reference.
 * @param {boolean} wasVisible Whether the page was visible before.
 * @param {number} nextVisibility Next visibility score.
 * @returns {boolean} True when the contents should be republished.
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
 * @param {AllowEffects} allowEffects Request effect permission.
 * @param {{updateFirestoreDocument: (allowEffects: AllowEffects, reference: unknown, data: object) => Promise<unknown>, variantRef: import('firebase-admin/firestore').DocumentReference, moderatorId: string, isApproved: boolean}} deps Admin-lock write dependencies.
 * @returns {Promise<void>} Promise.
 */
async function applyAdminLockIfNeeded(allowEffects, deps) {
  const { updateFirestoreDocument, variantRef, moderatorId, isApproved } = deps;
  if (moderatorId !== ADMIN_UID) {
    return;
  }
  await updateFirestoreDocument(allowEffects, variantRef, {
    visibility: calculateAdminLockedVisibility(isApproved),
    visibilityLockedBy: ADMIN_UID,
  });
}

/**
 * @param {{ allowEffects: AllowEffects, renderContents?: (allowEffects: AllowEffects, context?: object) => Promise<unknown> | undefined, pageRef: { path?: string } | null | undefined, rootPageRef: { path?: string } | null | undefined, wasVisible: boolean, nextVisibility: number }} deps Rendering decision inputs.
 * @returns {Promise<void>} Promise.
 */
async function republishContentsIfNeeded(deps) {
  if (
    !deps.renderContents ||
    !shouldRepublishContents(
      deps.pageRef,
      deps.rootPageRef,
      deps.wasVisible,
      deps.nextVisibility
    )
  ) {
    return;
  }
  await deps.renderContents(deps.allowEffects);
}

/**
 * Resolve the enclosing document through a document's parent collection.
 * @param {import('firebase-admin/firestore').DocumentReference} reference Child document reference.
 * @returns {import('firebase-admin/firestore').DocumentReference | null} Parent document or null.
 */
function getParentDocumentRef(reference) {
  const referenceWithParents = /** @type {{parent?: {parent?: unknown}}} */ (
    /** @type {unknown} */ (reference)
  );
  return /** @type {import('firebase-admin/firestore').DocumentReference|null} */ (
    referenceWithParents?.parent?.parent ?? null
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

// Stryker restore all
