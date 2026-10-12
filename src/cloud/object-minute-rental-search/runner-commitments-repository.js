import { projectRunnerCommitments } from '../../core/object-minute-rental-search/runner-commitments.js';
import { batchCommitmentRecords } from './batch-commitment-records.js';
/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Create the Firestore-backed runner commitments repository.
 * @param {{db: {collection: (name: string) => unknown}}} options Firestore dependency.
 * @returns {{listForRunner: (allowEffects: AllowEffects, options: {runnerId: string}) => Promise<Array<{startTimestamp: string, endTimestamp: string}>>}} Repository capability.
 */
export function createFirestoreRunnerCommitmentsRepository({ db }) {
  return {
    async listForRunner(allowEffects, { runnerId }) {
      void allowEffects;
      const snapshot = await db
        .collection('runner_assignments')
        .where('personId', '==', runnerId)
        .get();
      const assignments = (snapshot.docs ?? []).map(document =>
        document.data()
      );
      const { segments, points } = await batchCommitmentRecords(
        allowEffects,
        db,
        assignments
      );
      return projectRunnerCommitments({
        assignments,
        selectAssignments: assignments => {
          if (
            assignments.some(assignment => assignment?.personId !== runnerId)
          ) {
            throw new Error('invalid-person-id');
          }
          return assignments;
        },
        resolveSegment: segmentId => segments.get(segmentId) ?? null,
        resolvePoint: pointId => points.get(pointId) ?? null,
      });
    },
  };
}
