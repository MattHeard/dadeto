/**
 * Determine whether a Firestore document snapshot is missing.
 * @param {{ exists?: boolean }} doc Snapshot to inspect for existence.
 * @returns {boolean} True when the document is absent.
 */
export function isMissingDocument(doc) {
  return !doc?.exists;
}
