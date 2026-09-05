import { projectRunnerCommitments } from '../../core/object-minute-rental-search/runner-commitments.js';

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
      return projectRunnerCommitments({
        runnerId,
        assignments,
        assumeMatching: true,
        resolveSegment: async segmentId => {
          const document = await db.collection('segments').doc(segmentId).get();
          return document.exists ? document.data() : null;
        },
        resolvePoint: async pointId => {
          const document = await db
            .collection('spacetime_points')
            .doc(pointId)
            .get();
          return document.exists ? document.data() : null;
        },
      });
    },
  };
}
