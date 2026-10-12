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
