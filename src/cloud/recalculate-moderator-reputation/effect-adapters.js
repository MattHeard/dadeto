/**
 * Persist moderator reputation values and mark existing author records dirty.
 * @param {import('../../types/allow-effects').AllowEffects} allowEffects Command permission.
 * @param {{ collection: (name: string) => { doc: (id: string) => { get?: () => Promise<{ exists?: boolean }>; set: (data: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void> } } }} db Firestore database instance.
 * @param {import('../../core/cloud/recalculate-moderator-reputation/recalculate-moderator-reputation-core.js').ModeratorReputationRecord[]} reputations Reputation values to persist.
 * @param {{ updatedAt: unknown }} metadata Shared timestamp for the writes.
 * @returns {Promise<void>} Resolves after all persistence operations complete.
 */
export async function writeModeratorReputations(
  allowEffects,
  db,
  reputations,
  metadata
) {
  void allowEffects;
  await Promise.all(
    reputations.map(async record => {
      await db.collection('moderators').doc(record.moderatorId).set(
        {
          moderatorReputation: record.reputation,
          moderatorReputationUpdatedAt: metadata.updatedAt,
        },
        { merge: true }
      );

      const authorRef = db.collection('authors').doc(record.moderatorId);
      const authorSnapshot = await authorRef.get?.();
      if (authorSnapshot?.exists) {
        await authorRef.set({ dirty: true }, { merge: true });
      }
    })
  );
}
