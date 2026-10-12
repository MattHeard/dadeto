/** @param {import('../../../types/allow-effects').AllowEffects} permission @param {() => void} ensureApp */
export function initializeModerationRatingFirebase(permission, ensureApp) {
  void permission;
  ensureApp();
}

/** @param {import('../../../types/allow-effects').AllowEffects} permission @param {object} moderatorRef @param {object} update */
export async function updateModeratorAssignment(permission, moderatorRef, update) {
  void permission;
  await /** @type {any} */ (moderatorRef).update(update);
}

/** @param {import('../../../types/allow-effects').AllowEffects} permission @param {object} db @param {{ id: string, moderatorId: string, variantId: string, isApproved: boolean, ratedAt: unknown }} rating */
export async function recordRating(permission, db, rating) {
  void permission;
  const { id, moderatorId, variantId, isApproved, ratedAt } = rating;
  await /** @type {any} */ (db).collection('moderationRatings').doc(id).set({
    moderatorId,
    variantId,
    isApproved,
    ratedAt,
  });
}
