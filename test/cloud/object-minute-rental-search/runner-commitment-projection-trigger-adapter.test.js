import { describe, expect, test, jest } from '@jest/globals';
import { createAllowEffects } from '../../../src/cloud/allow-effects.js';
import { registerRunnerCommitmentProjectionTriggers } from '../../../src/cloud/object-minute-rental-search/runner-commitment-projection-trigger-adapter.js';

describe('runner commitment projection trigger adapter', () => {
  test('registers all three source paths in the selected database and region', () => {
    const registrations = [];
    const firestore = {
      document: jest.fn(path => ({
        onWrite: jest.fn(handler => {
          registrations.push({ path, handler });
          return { path };
        }),
      })),
    };
    const database = jest.fn(() => firestore);
    const regionalFunctions = { firestore: { ...firestore, database } };
    const functions = { region: jest.fn(() => regionalFunctions) };
    const handlers = {
      assignment: jest.fn(),
      segment: jest.fn(),
      point: jest.fn(),
    };

    const result = registerRunnerCommitmentProjectionTriggers(
      createAllowEffects(),
      functions,
      { region: 'europe-west3', database: 'dendrite', handlers }
    );

    expect(functions.region).toHaveBeenCalledWith('europe-west3');
    expect(database).toHaveBeenCalledWith('dendrite');
    expect(registrations.map(({ path }) => path)).toEqual([
      'runner_assignments/{assignmentId}',
      'segments/{segmentId}',
      'spacetime_points/{pointId}',
    ]);
    expect(registrations.map(({ handler }) => handler)).toEqual([
      handlers.assignment,
      handlers.segment,
      handlers.point,
    ]);
    expect(result).toEqual({
      assignment: { path: 'runner_assignments/{assignmentId}' },
      segment: { path: 'segments/{segmentId}' },
      point: { path: 'spacetime_points/{pointId}' },
    });
  });

  test('uses the default database when configured with its canonical ID', () => {
    const onWrite = jest.fn(() => ({ trigger: true }));
    const document = jest.fn(() => ({ onWrite }));
    const functions = {
      region: () => ({ firestore: { document } }),
    };
    const handlers = {
      assignment: jest.fn(),
      segment: jest.fn(),
      point: jest.fn(),
    };

    expect(
      registerRunnerCommitmentProjectionTriggers(
        createAllowEffects(),
        functions,
        {
          region: 'us-central1',
          database: '(default)',
          handlers,
        }
      )
    ).toMatchObject({
      assignment: { trigger: true },
      segment: { trigger: true },
      point: { trigger: true },
    });
    expect(document).toHaveBeenCalledTimes(3);
  });

  test('fails clearly when named database trigger registration is unavailable', () => {
    const functions = {
      region: () => ({
        firestore: { document: () => ({ onWrite: () => {} }) },
      }),
    };
    expect(() =>
      registerRunnerCommitmentProjectionTriggers(
        createAllowEffects(),
        functions,
        {
          region: 'us-central1',
          database: 'dendrite',
          handlers: {
            assignment: jest.fn(),
            segment: jest.fn(),
            point: jest.fn(),
          },
        }
      )
    ).toThrow('named-firestore-database-triggers-unsupported');
  });
});
