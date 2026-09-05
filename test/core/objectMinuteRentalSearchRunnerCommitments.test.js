import { describe, expect, test, jest } from '@jest/globals';
import { createBrowserRunnerCommitmentsRepository } from '../../src/core/object-minute-rental-search/browser-runner-commitments-repository.js';
import { createObjectMinuteRentalSearch } from '../../src/core/object-minute-rental-search/search-application.js';
import { createFirestoreRunnerCommitmentsRepository } from '../../src/cloud/object-minute-rental-search/runner-commitments-repository.js';
import { projectRunnerCommitments } from '../../src/core/object-minute-rental-search/runner-commitments.js';

const assignment = { personId: 'RUNNER-1', segmentId: 'SEGMENT-1' };
const segment = {
  segmentId: 'SEGMENT-1',
  startPointId: 'POINT-1',
  endPointId: 'POINT-2',
};
const points = [
  { pointId: 'POINT-1', timestamp: '2026-08-27T15:00Z' },
  { pointId: 'POINT-2', timestamp: '2026-08-27T15:30Z' },
];

describe('runner commitments repositories', () => {
  test('rejects invalid projection inputs and incomplete records', async () => {
    await expect(
      projectRunnerCommitments({ assignments: null })
    ).rejects.toThrow('invalid-assignments');
    await expect(
      projectRunnerCommitments({
        runnerId: 'RUNNER-1',
        assignments: [{ personId: 'OTHER', segmentId: 'SEGMENT-1' }],
        assumeMatching: true,
        resolveSegment: async () => segment,
        resolvePoint: async pointId =>
          points.find(point => point.pointId === pointId),
      })
    ).rejects.toThrow('invalid-person-id');
    await expect(
      projectRunnerCommitments({
        runnerId: 'RUNNER-1',
        assignments: [{ personId: 'RUNNER-1', segmentId: '' }],
        resolveSegment: async () => segment,
        resolvePoint: async () => points[0],
      })
    ).rejects.toThrow('missing-segment-id');
    await expect(
      projectRunnerCommitments({
        runnerId: 'RUNNER-1',
        assignments: [{ personId: 'RUNNER-1', segmentId: 'SEGMENT-1' }],
        resolveSegment: async () => null,
        resolvePoint: async () => points[0],
      })
    ).rejects.toThrow('missing-segment');
  });

  test('rejects missing segment and point identifiers', async () => {
    await expect(
      projectRunnerCommitments({
        runnerId: 'RUNNER-1',
        assignments: [assignment],
        resolveSegment: async () => ({ endPointId: 'POINT-2' }),
        resolvePoint: async () => points[0],
      })
    ).rejects.toThrow('missing-start-point-id');
    await expect(
      projectRunnerCommitments({
        runnerId: 'RUNNER-1',
        assignments: [assignment],
        resolveSegment: async () => ({ startPointId: 'POINT-1' }),
        resolvePoint: async () => points[0],
      })
    ).rejects.toThrow('missing-end-point-id');
    await expect(
      projectRunnerCommitments({
        runnerId: 'RUNNER-1',
        assignments: [assignment],
        resolveSegment: async () => segment,
        resolvePoint: async pointId =>
          pointId === 'POINT-1' ? { timestamp: 'not-a-time' } : points[1],
      })
    ).rejects.toThrow('invalid-start-timestamp');
  });

  test('sorts intervals by end time when starts are equal', async () => {
    await expect(
      projectRunnerCommitments({
        runnerId: 'RUNNER-1',
        assignments: [assignment, { ...assignment, segmentId: 'SEGMENT-2' }],
        resolveSegment: async segmentId => ({
          startPointId: 'POINT-1',
          endPointId: segmentId === 'SEGMENT-1' ? 'POINT-2' : 'POINT-3',
        }),
        resolvePoint: async pointId =>
          pointId === 'POINT-3'
            ? { timestamp: '2026-08-27T15:45Z' }
            : points.find(point => point.pointId === pointId),
      })
    ).resolves.toEqual([
      {
        startTimestamp: '2026-08-27T15:00Z',
        endTimestamp: '2026-08-27T15:30Z',
      },
      {
        startTimestamp: '2026-08-27T15:00Z',
        endTimestamp: '2026-08-27T15:45Z',
      },
    ]);
  });

  test('projects valid browser records and ignores other runners', async () => {
    const repository = createBrowserRunnerCommitmentsRepository({
      runnerAssignments: [assignment, { ...assignment, personId: 'OTHER' }],
      segments: [segment],
      spacetimePoints: points,
    });
    await expect(
      repository.listForRunner({ runnerId: 'RUNNER-1' })
    ).resolves.toEqual([
      {
        startTimestamp: '2026-08-27T15:00Z',
        endTimestamp: '2026-08-27T15:30Z',
      },
    ]);
  });

  test('fails closed when a matching browser commitment is incomplete', async () => {
    const repository = createBrowserRunnerCommitmentsRepository({
      runnerAssignments: [assignment],
      segments: [],
      spacetimePoints: points,
    });
    await expect(
      repository.listForRunner({ runnerId: 'RUNNER-1' })
    ).rejects.toThrow('missing-segment');
  });

  test('fails closed for invalid timestamps and reversed intervals', async () => {
    const invalid = createBrowserRunnerCommitmentsRepository({
      runnerAssignments: [assignment],
      segments: [segment],
      spacetimePoints: [
        points[0],
        { pointId: 'POINT-2', timestamp: 'not-a-time' },
      ],
    });
    await expect(
      invalid.listForRunner({ runnerId: 'RUNNER-1' })
    ).rejects.toThrow('invalid-end-timestamp');
    const reversed = createBrowserRunnerCommitmentsRepository({
      runnerAssignments: [assignment],
      segments: [segment],
      spacetimePoints: [
        { pointId: 'POINT-1', timestamp: '2026-08-27T16:00Z' },
        { pointId: 'POINT-2', timestamp: '2026-08-27T15:00Z' },
      ],
    });
    await expect(
      reversed.listForRunner({ runnerId: 'RUNNER-1' })
    ).rejects.toThrow('reversed-commitment-interval');
  });

  test('projects Firestore records through the repository contract', async () => {
    const get = jest.fn(async () => ({ exists: true, data: () => segment }));
    const pointGet = jest
      .fn()
      .mockResolvedValueOnce({ exists: true, data: () => points[0] })
      .mockResolvedValueOnce({ exists: true, data: () => points[1] });
    const db = {
      collection: jest.fn(name => {
        if (name === 'runner_assignments')
          return {
            where: jest.fn(() => ({
              get: async () => ({ docs: [{ data: () => assignment }] }),
            })),
          };
        if (name === 'segments') return { doc: () => ({ get }) };
        return { doc: () => ({ get: pointGet }) };
      }),
    };
    const repository = createFirestoreRunnerCommitmentsRepository({ db });
    await expect(
      repository.listForRunner({ runnerId: 'RUNNER-1' })
    ).resolves.toEqual([
      {
        startTimestamp: '2026-08-27T15:00Z',
        endTimestamp: '2026-08-27T15:30Z',
      },
    ]);
    expect(db.collection).toHaveBeenCalledWith('runner_assignments');
  });

  test('keeps the shared application independent of storage', async () => {
    const listForRunner = jest.fn(async () => [
      {
        startTimestamp: '2026-08-27T15:00Z',
        endTimestamp: '2026-08-27T15:30Z',
      },
    ]);
    const search = createObjectMinuteRentalSearch({
      runnerCommitmentsRepository: { listForRunner },
      runnerId: 'RUNNER-9',
    });
    await expect(
      search({
        requestText: 'football',
        deliveryPoint: { timestamp: '2026-08-27T19:00Z' },
        pickupPoint: { timestamp: '2026-08-27T20:00Z' },
        durations: {
          deliveryOutboundSeconds: 2700,
          procurementSeconds: 1800,
          pickupReturnSeconds: 2700,
        },
        supplierAvailability: {
          startTimestamp: '2026-08-27T07:00Z',
          endTimestamp: '2026-08-27T17:00Z',
        },
        runnerSchedule: [
          {
            startTimestamp: '2026-08-27T15:00Z',
            endTimestamp: '2026-08-27T21:00Z',
          },
        ],
        nowTimestamp: '2026-08-27T15:00Z',
      })
    ).resolves.toMatchObject({ valid: true });
    expect(listForRunner).toHaveBeenCalledWith({ runnerId: 'RUNNER-9' });
  });
});
