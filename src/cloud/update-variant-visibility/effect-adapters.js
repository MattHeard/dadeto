/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/** Build permission-first adapters for variant visibility document writes. */
export function createUpdateVariantVisibilityEffectAdapters() {
  return {
    /** @param {AllowEffects} allowEffects Permission for the write. @param {import('firebase-admin/firestore').DocumentReference} reference Target document. @param {object} data Values to update. @returns {Promise<unknown>} Firestore update result. */
    updateFirestoreDocument: (allowEffects, reference, data) => {
      void allowEffects;
      return reference.update(data);
    },
  };
}
