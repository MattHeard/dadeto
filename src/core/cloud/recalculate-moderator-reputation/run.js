import { ADMIN_UID } from '../../commonCore.js';

/**
 * @typedef {object} RecalculateModeratorReputationDeps
 * @property {unknown} db Firestore database instance.
 * @property {() => Promise<import('./recalculate-moderator-reputation-core.js').ModerationRatingRecord[]>} fetchModerationRatings Ratings loader.
 * @property {(ratings: import('./recalculate-moderator-reputation-core.js').ModerationRatingRecord[], adminModeratorId: string) => import('./recalculate-moderator-reputation-core.js').ModeratorReputationRecord[]} calculateModeratorReputations Reputation calculator.
 * @property {(db: unknown, reputations: import('./recalculate-moderator-reputation-core.js').ModeratorReputationRecord[], metadata: { updatedAt: string }) => Promise<void>} writeModeratorReputations Reputation writer.
 * @property {string} adminModeratorId Admin moderator id.
 * @property {() => string} nowIso ISO timestamp generator.
 */

/**
 * Create the daily moderator reputation recomputation job.
 * @param {RecalculateModeratorReputationDeps} deps Job dependencies.
 * @returns {() => Promise<void>} Recompute job.
 */
export function createRecalculateModeratorReputationJob({
  db,
  fetchModerationRatings,
  calculateModeratorReputations,
  writeModeratorReputations,
  adminModeratorId,
  nowIso,
}) {
  return async function recalculateModeratorReputationJob() {
    const ratings = await fetchModerationRatings(db);
    const reputations = calculateModeratorReputations(
      ratings,
      adminModeratorId
    );

    await writeModeratorReputations(db, reputations, {
      updatedAt: nowIso(),
    });
  };
}
