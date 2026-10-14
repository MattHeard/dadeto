import { selectRunnerCommitmentProjection } from '../../core/object-minute-rental-search/commitment-records/index.js';
/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Create the Firestore-backed indexed projection reader.
 * @param {{db: {collection: (name: string) => {where: (field: string, operator: string, value: string) => {get: () => Promise<{docs?: Array<{data: () => unknown}>}>}}}, collectionName?: string}} options Firestore dependency.
 * @returns {{listForRunner: (allowEffects: AllowEffects, options: {runnerId: string}) => Promise<Array<{startTimestamp: string, endTimestamp: string}>>}} Repository capability.
 */
export function createFirestoreRunnerCommitmentProjectionReader({
  db,
  collectionName = 'runner_commitment_projections',
}) {
  return {
    async listForRunner(allowEffects, { runnerId }) {
      void allowEffects;
      const snapshot = await db
        .collection(collectionName)
        .where('personId', '==', runnerId)
        .get();
      return selectRunnerCommitmentProjection(
        (snapshot.docs ?? []).map(document => document.data()),
        runnerId
      );
    },
  };
}
