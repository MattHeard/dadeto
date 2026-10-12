/**
 * @typedef {object} RecalculateModeratorReputationDeps
 * @property {() => Promise<import('./recalculate-moderator-reputation-core.js').ModerationRatingRecord[]>} fetchModerationRatings Ratings loader.
 * @property {(ratings: import('./recalculate-moderator-reputation-core.js').ModerationRatingRecord[], adminModeratorId: string) => import('./recalculate-moderator-reputation-core.js').ModeratorReputationRecord[]} calculateModeratorReputations Reputation calculator.
 * @property {(allowEffects: import('../../../../types/allow-effects').AllowEffects, reputations: import('./recalculate-moderator-reputation-core.js').ModeratorReputationRecord[], metadata: { updatedAt: string }) => Promise<void>} writeModeratorReputations Permission-aware reputation writer.
 * @property {string} adminModeratorId Admin moderator id.
 * @property {() => string} nowIso ISO timestamp generator.
 */

/**
 * Create the daily moderator reputation recomputation job.
 * @param {RecalculateModeratorReputationDeps} deps Job dependencies.
 * @returns {(allowEffects: import('../../../../types/allow-effects').AllowEffects) => Promise<void>} Recompute job.
 */
export function createRecalculateModeratorReputationJob(deps) {
  const fetchModerationRatings = deps.fetchModerationRatings;
  const calculateModeratorReputations = deps.calculateModeratorReputations;
  const writeModeratorReputations = deps.writeModeratorReputations;
  const adminModeratorId = deps.adminModeratorId;
  const nowIso = deps.nowIso;

  return async function recalculateModeratorReputationJob(allowEffects) {
    const ratings = await fetchModerationRatings();
    const reputations = calculateModeratorReputations(
      ratings,
      adminModeratorId
    );

    await writeModeratorReputations(allowEffects, reputations, {
      updatedAt: nowIso(),
    });
  };
}
