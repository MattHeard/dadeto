import { refreshRunnerCommitmentProjectionTransaction } from './runner-commitment-projection-transaction.js';
/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Create a transactional writer for the runner-commitment read projection.
 * @param {{db: {collection: (name: string) => {doc: (id: string) => unknown}, runTransaction: (operation: (transaction: {get: (reference: unknown) => Promise<{exists: boolean, id: string, data: () => unknown}>, set: (reference: unknown, value: object) => void, delete: (reference: unknown) => void}) => Promise<unknown>}, projectionCollection?: string}} options Firestore dependencies.
 * @returns {{refresh: (allowEffects: AllowEffects, options: {assignmentId: string}) => Promise<void>}} Projection refresh capability.
 */
export function createRunnerCommitmentProjectionRepository({
  db,
  projectionCollection = 'runner_commitment_projections',
}) {
  return {
    async refresh(allowEffects, { assignmentId }) {
      void allowEffects;
      const assignmentRef = db.collection('runner_assignments').doc(assignmentId);
      const projectionRef = db
        .collection(projectionCollection)
        .doc(assignmentId);
      await db.runTransaction(transaction =>
        refreshRunnerCommitmentProjectionTransaction(allowEffects, db, transaction, {
          assignmentId,
          assignmentRef,
          projectionRef,
        })
      );
    },
  };
}
