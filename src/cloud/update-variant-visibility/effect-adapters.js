/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/** Build permission-first adapters for variant visibility document writes. */
export function createUpdateVariantVisibilityEffectAdapters() {
  return {
    /** @param {AllowEffects} allowEffects Permission for the write. @param {unknown} reference Target document reference. @param {object} data Values to update. @returns {Promise<unknown>} Firestore update result. */
    updateFirestoreDocument: (allowEffects, reference, data) => {
      void allowEffects;
      const writableReference = /** @type {{update: (data: object) => Promise<unknown>}} */ (
        reference
      );
      return writableReference.update(data);
    },
  };
}

/** @param {AllowEffects} allowEffects Permission to register the trigger. @param {{region: (name: string) => {firestore: {document: (path: string) => {onCreate: (handler: unknown) => unknown}}}}} functions Cloud Functions registry. @param {unknown} handler Trigger callback. @returns {unknown} Registered trigger. */
export function registerUpdateVariantVisibilityTrigger(
  allowEffects,
  functions,
  handler
) {
  void allowEffects;
  return functions
    .region('europe-west1')
    .firestore.document('moderationRatings/{ratingId}')
    .onCreate(handler);
}
