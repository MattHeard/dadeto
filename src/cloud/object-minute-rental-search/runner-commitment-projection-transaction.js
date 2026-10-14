import { buildRunnerCommitmentProjectionRecord } from '../../core/object-minute-rental-search/commitment-records/index.js';
import { readRunnerCommitmentProjectionSourceRecords } from './runner-commitment-projection-source-records.js';
/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Refresh or delete one projection inside its source-document transaction.
 * @param {AllowEffects} allowEffects Permission for Firestore operations.
 * @param {{collection: (name: string) => {doc: (id: string) => unknown}}} db Firestore database.
 * @param {{get: (reference: unknown) => Promise<{exists: boolean, data: () => unknown}>, set: (reference: unknown, value: object) => void, delete: (reference: unknown) => void}} transaction Firestore transaction.
 * @param {{assignmentId: string, assignmentRef: unknown, projectionRef: unknown}} options Assignment and projection references.
 * @returns {Promise<void>} Transaction result.
 */
export async function refreshRunnerCommitmentProjectionTransaction(
  allowEffects,
  db,
  transaction,
  { assignmentId, assignmentRef, projectionRef }
) {
  void allowEffects;
  const assignmentSnapshot = await transaction.get(assignmentRef);
  if (!assignmentSnapshot.exists) {
    transaction.delete(projectionRef);
    return;
  }
  const assignment = assignmentSnapshot.data();
  const sources = await readRunnerCommitmentProjectionSourceRecords(
    allowEffects,
    db,
    transaction,
    assignment
  );
  const projection = sources
    ? buildRunnerCommitmentProjectionRecord(
        assignmentId,
        assignment,
        sources.segment,
        pointId => sources.points.get(pointId)
      )
    : null;
  if (projection) transaction.set(projectionRef, projection);
  else transaction.delete(projectionRef);
}
