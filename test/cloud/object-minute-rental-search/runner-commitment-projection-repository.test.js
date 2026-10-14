import { describe, expect, test } from '@jest/globals';
import { createAllowEffects } from '../../../src/cloud/allow-effects.js';
import { createRunnerCommitmentProjectionRepository } from '../../../src/cloud/object-minute-rental-search/runner-commitment-projection-repository.js';

const allowEffects = createAllowEffects();

/**
 *
 * @param sourceDocuments
 */
/**
 * @param {Record<string, object>} sourceDocuments Firestore source fixtures.
 * @returns {{db: object, reads: object[], writes: object[]}} Firestore test double and observations.
 */
function createDb(sourceDocuments) {
  const reads = [];
  const writes = [];
  const db = {
    collection: name => ({
      doc: id => ({ collection: name, id }),
    }),
    runTransaction: async operation =>
      operation({
        get: async reference => {
          reads.push(reference);
          const data =
            sourceDocuments[`${reference.collection}/${reference.id}`];
          return {
            exists: data !== undefined,
            data: () => data,
          };
        },
        set: (reference, value) =>
          writes.push({ operation: 'set', reference, value }),
        delete: reference => writes.push({ operation: 'delete', reference }),
      }),
  };
  return { db, reads, writes };
}

describe('runner commitment projection repository', () => {
  test('transactionally writes a denormalized record from current sources', async () => {
    const { db, reads, writes } = createDb({
      'runner_assignments/a1': { personId: 'RUNNER-1', segmentId: 's1' },
      'segments/s1': { startPointId: 'p1', endPointId: 'p2' },
      'spacetime_points/p1': { timestamp: '2030-01-01T10:00:00Z' },
      'spacetime_points/p2': { timestamp: '2030-01-01T11:00:00Z' },
    });

    await createRunnerCommitmentProjectionRepository({ db }).refresh(
      allowEffects,
      { assignmentId: 'a1' }
    );

    expect(reads.map(({ collection }) => collection)).toEqual([
      'runner_assignments',
      'segments',
      'spacetime_points',
      'spacetime_points',
    ]);
    expect(writes).toEqual([
      {
        operation: 'set',
        reference: { collection: 'runner_commitment_projections', id: 'a1' },
        value: {
          assignmentId: 'a1',
          personId: 'RUNNER-1',
          startTimestamp: '2030-01-01T10:00:00Z',
          endTimestamp: '2030-01-01T11:00:00Z',
        },
      },
    ]);
  });

  test('deletes a stale projection when its source assignment was deleted', async () => {
    const { db, writes } = createDb({});

    await createRunnerCommitmentProjectionRepository({ db }).refresh(
      allowEffects,
      { assignmentId: 'a1' }
    );

    expect(writes).toEqual([
      {
        operation: 'delete',
        reference: { collection: 'runner_commitment_projections', id: 'a1' },
      },
    ]);
  });

  test('deletes stale projections when a source dependency is missing', async () => {
    const { db, writes } = createDb({
      'runner_assignments/a1': { personId: 'RUNNER-1', segmentId: 's1' },
    });

    await createRunnerCommitmentProjectionRepository({ db }).refresh(
      allowEffects,
      { assignmentId: 'a1' }
    );

    expect(writes).toEqual([
      {
        operation: 'delete',
        reference: { collection: 'runner_commitment_projections', id: 'a1' },
      },
    ]);
  });
});
