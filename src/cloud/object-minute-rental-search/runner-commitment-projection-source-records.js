/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
/**
 * Read current segment and point records within a Firestore transaction.
 * @param {AllowEffects} allowEffects Permission for Firestore reads.
 * @param {{collection: (name: string) => {doc: (id: string) => unknown}}} db Firestore database.
 * @param {{get: (reference: unknown) => Promise<{exists: boolean, data: () => unknown}>}} transaction Firestore transaction.
 * @param {{segmentId?: unknown}} assignment Source assignment.
 * @returns {Promise<{segment: object, points: Map<string, object|null>}|null} Resolved sources, or null when incomplete.
 */
export async function readRunnerCommitmentProjectionSourceRecords(
  allowEffects,
  db,
  transaction,
  assignment
) {
  void allowEffects;
  const usableId = /** @type {(value: unknown) => string|null} */ (value =>
    typeof value === 'string' && value.trim() ? value.trim() : null
  );
  const segmentId = usableId(assignment?.segmentId);
  if (!segmentId) return null;
  const segmentSnapshot = await transaction.get(
    db.collection('segments').doc(segmentId)
  );
  if (!segmentSnapshot.exists) return null;
  const segment = segmentSnapshot.data();
  const startPointId = usableId(segment?.startPointId);
  const endPointId = usableId(segment?.endPointId);
  if (!startPointId || !endPointId) return null;
  const [startPoint, endPoint] = await Promise.all([
    readPoint(db, transaction, startPointId),
    readPoint(db, transaction, endPointId),
  ]);
  return {
    segment,
    points: new Map([
      [startPointId, startPoint],
      [endPointId, endPoint],
    ]),
  };
}

/** @param {object} db Firestore database. @param {object} transaction Firestore transaction. @param {string} pointId Point document ID. @returns {Promise<object|null>} Current point record. */
async function readPoint(db, transaction, pointId) {
  const snapshot = await transaction.get(
    db.collection('spacetime_points').doc(pointId)
  );
  return snapshot.exists ? snapshot.data() : null;
}
