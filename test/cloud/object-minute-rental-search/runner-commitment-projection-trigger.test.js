import { describe, expect, test, jest } from '@jest/globals';
import { createAllowEffects } from '../../../src/cloud/allow-effects.js';
import { createRunnerCommitmentProjectionTriggerHandler } from '../../../src/cloud/object-minute-rental-search/runner-commitment-projection-trigger.js';

const allowEffects = createAllowEffects();

/**
 *
 * @param resultsByQuery
 */
/**
 * @param {Record<string, Array<{id: string}>>} resultsByQuery Query fixtures.
 * @returns {{db: object, queries: object[]}} Firestore query double and observations.
 */
function createQueryDb(resultsByQuery) {
  const queries = [];
  const db = {
    collection: name => ({
      where: (field, operator, value) => ({
        get: async () => {
          queries.push({ name, field, operator, value });
          const queryValue = Array.isArray(value) ? value.join(',') : value;
          return {
            docs: resultsByQuery[`${name}:${field}:${queryValue}`] ?? [],
          };
        },
      }),
    }),
  };
  return { db, queries };
}

describe('runner commitment projection triggers', () => {
  test('refreshes the assignment directly when an assignment changes', async () => {
    const { db, queries } = createQueryDb({});
    const repository = { refresh: jest.fn(async () => undefined) };
    const handler = createRunnerCommitmentProjectionTriggerHandler({
      db,
      repository,
      sourceType: 'assignment',
    });

    await handler(allowEffects, {}, { params: { assignmentId: 'a1' } });

    expect(queries).toEqual([]);
    expect(repository.refresh).toHaveBeenCalledWith(allowEffects, {
      assignmentId: 'a1',
    });
  });

  test('refreshes assignments whose segment changed', async () => {
    const { db, queries } = createQueryDb({
      'runner_assignments:segmentId:s1': [{ id: 'a1' }, { id: 'a2' }],
    });
    const repository = { refresh: jest.fn(async () => undefined) };

    await createRunnerCommitmentProjectionTriggerHandler({
      db,
      repository,
      sourceType: 'segment',
    })(allowEffects, {}, { params: { segmentId: 's1' } });

    expect(queries).toEqual([
      {
        name: 'runner_assignments',
        field: 'segmentId',
        operator: 'in',
        value: ['s1'],
      },
    ]);
    expect(repository.refresh.mock.calls.map(([, value]) => value)).toEqual([
      { assignmentId: 'a1' },
      { assignmentId: 'a2' },
    ]);
  });

  test('refreshes assignments for both point references without duplicates', async () => {
    const { db, queries } = createQueryDb({
      'segments:startPointId:p1': [{ id: 's1' }, { id: 's2' }],
      'segments:endPointId:p1': [{ id: 's2' }],
      'runner_assignments:segmentId:s1,s2': [{ id: 'a1' }, { id: 'a2' }],
    });
    const repository = { refresh: jest.fn(async () => undefined) };

    await createRunnerCommitmentProjectionTriggerHandler({
      db,
      repository,
      sourceType: 'point',
    })(allowEffects, {}, { params: { pointId: 'p1' } });

    expect(queries).toHaveLength(3);
    expect(repository.refresh.mock.calls.map(([, value]) => value)).toEqual([
      { assignmentId: 'a1' },
      { assignmentId: 'a2' },
    ]);
  });

  test('rejects unknown source types and missing event identifiers', async () => {
    const { db } = createQueryDb({});
    const repository = { refresh: jest.fn(async () => undefined) };
    expect(() =>
      createRunnerCommitmentProjectionTriggerHandler({
        db,
        repository,
        sourceType: 'unknown',
      })
    ).toThrow('invalid-projection-source-type');
    await expect(
      createRunnerCommitmentProjectionTriggerHandler({
        db,
        repository,
        sourceType: 'point',
      })(allowEffects, {}, { params: {} })
    ).rejects.toThrow('invalid-projection-source-id');
  });
});
