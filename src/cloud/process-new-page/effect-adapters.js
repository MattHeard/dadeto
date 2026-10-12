/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Mark a skipped submission as processed at the Firestore boundary.
 * @param {AllowEffects} allowEffects Permission for this trigger-time write.
 * @param {import('firebase-admin/firestore').DocumentReference} document Submission document.
 * @param {Record<string, unknown>} data Fields to write.
 * @returns {Promise<unknown>} Firestore update result.
 */
export function updateSubmissionDocument(allowEffects, document, data) {
  void allowEffects;
  return document.update(data);
}

/**
 * Create a per-invocation batch facade whose mutating methods are authorized by
 * the trigger capability. The raw Firestore batch stays at the cloud boundary.
 * @param {AllowEffects} allowEffects Permission for this trigger's batch writes.
 * @param {import('firebase-admin/firestore').Firestore} db Firestore instance.
 * @returns {{set: (allowEffects: AllowEffects, reference: import('firebase-admin/firestore').DocumentReference, data: Record<string, unknown>) => unknown, update: (allowEffects: AllowEffects, reference: import('firebase-admin/firestore').DocumentReference, data: Record<string, unknown>) => unknown, commit: (allowEffects: AllowEffects) => Promise<unknown>}} Narrow permission-first batch facade.
 */
export function createSubmissionBatch(db) {
  const batch = db.batch();
  return {
    set: (allowEffects, reference, data) => {
      void allowEffects;
      return batch.set(reference, data);
    },
    update: (allowEffects, reference, data) => {
      void allowEffects;
      return batch.update(reference, data);
    },
    commit: allowEffects => {
      void allowEffects;
      return batch.commit();
    },
  };
}
