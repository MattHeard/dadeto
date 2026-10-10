import { projectRunnerCommitments } from '../../core/object-minute-rental-search/runner-commitments.js';
import { batchCommitmentRecords } from './batch-commitment-records.js';

/**
 * Create the Firestore-backed runner commitments repository.
 * @param {{db: {collection: (name: string) => unknown}}} options Firestore dependency.
 * @returns {{listForRunner: (options: {runnerId: string}) => Promise<Array<{startTimestamp: string, endTimestamp: string}>>}} Repository capability.
 */
export function createFirestoreRunnerCommitmentsRepository({ db }) {
  return {
    async listForRunner({ runnerId }) {
      const snapshot = await db
        .collection('runner_assignments')
        .where('personId', '==', runnerId)
        .get();
      const assignments = (snapshot.docs ?? []).map(document =>
        document.data()
      );
      const { segments, points } = await batchCommitmentRecords(db, assignments);
      return projectRunnerCommitments({
        runnerId,
        assignments,
        assumeMatching: true,
        resolveSegment: segmentId => segments.get(segmentId) ?? null,
        resolvePoint: pointId => points.get(pointId) ?? null,
      });
    },
  };
}
