import { describe, expect, test, jest } from '@jest/globals';
import { createBrowserRunnerCommitmentsRepository } from '../../src/core/object-minute-rental-search/browser-runner-commitments-repository.js';
import { createObjectMinuteRentalSearch } from '../../src/core/object-minute-rental-search/search-application.js';
import { createFirestoreRunnerCommitmentsRepository } from '../../src/cloud/object-minute-rental-search/runner-commitments-repository.js';
import { projectRunnerCommitments } from '../../src/core/object-minute-rental-search/runner-commitments.js';
import {
  buildRunnerCommitmentProjectionRecord,
  selectRunnerCommitmentProjection,
} from '../../src/core/object-minute-rental-search/commitment-records/index.js';
import { SOPHIE_CHARLOTTE_SERVICE_AREA } from '../../src/core/object-minute-rental-search/service-area.js';
import { createAllowEffects } from '../../src/cloud/allow-effects.js';
const allowEffects = createAllowEffects();

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

/**
 * Create the assignment selection policy for a runner projection.
 * @param {string} runnerId Runner identifier.
 * @param {boolean} rejectNonMatching Whether a non-matching record is invalid.
 * @returns {(assignments: Array<{personId?: unknown}>) => Array<{personId?: unknown}>} Assignment selector.
 */
function createRunnerAssignmentSelector(runnerId, rejectNonMatching = false) {
  return assignments => {
    const matching = assignments.filter(
      assignment => assignment?.personId === runnerId
    );
    if (rejectNonMatching && matching.length !== assignments.length) {
      throw new Error('invalid-person-id');
    }
    return matching;
  };
}

describe('runner commitments repositories', () => {
  test('builds a minimal read record and fails closed for incomplete sources', () => {
    expect(
      buildRunnerCommitmentProjectionRecord(
        'ASSIGNMENT-1',
        assignment,
        segment,
        pointId => points.find(point => point.pointId === pointId)
      )
    ).toEqual({
      assignmentId: 'ASSIGNMENT-1',
      personId: 'RUNNER-1',
      startTimestamp: '2026-08-27T15:00Z',
      endTimestamp: '2026-08-27T15:30Z',
    });
    expect(
      buildRunnerCommitmentProjectionRecord(
        'ASSIGNMENT-1',
        assignment,
        null,
        () => null
      )
    ).toBeNull();
    const validSource = {
      assignmentId: 'ASSIGNMENT-1',
      assignment,
      segment,
      resolvePoint: pointId => points.find(point => point.pointId === pointId),
    };
    for (const invalidSource of [
      { ...validSource, assignmentId: ' ' },
      { ...validSource, assignment: { ...assignment, personId: '' } },
      { ...validSource, segment: { ...segment, startPointId: '' } },
      { ...validSource, segment: { ...segment, endPointId: '' } },
      {
        ...validSource,
        resolvePoint: pointId =>
          pointId === 'POINT-1' ? { timestamp: 'invalid' } : points[1],
      },
      {
        ...validSource,
        resolvePoint: pointId =>
          pointId === 'POINT-2' ? { timestamp: 'invalid' } : points[0],
      },
    ]) {
      expect(
        buildRunnerCommitmentProjectionRecord(
          invalidSource.assignmentId,
          invalidSource.assignment,
          invalidSource.segment,
          invalidSource.resolvePoint
        )
      ).toBeNull();
    }
    expect(
      buildRunnerCommitmentProjectionRecord(
        'ASSIGNMENT-1',
        assignment,
        segment,
        pointId => points.find(point => point.pointId !== pointId)
      )
    ).toBeNull();
    expect(
      selectRunnerCommitmentProjection(
        [
          {
            personId: 'RUNNER-1',
            startTimestamp: '2026-08-27T15:30Z',
            endTimestamp: '2026-08-27T16:00Z',
          },
          {
            personId: 'RUNNER-1',
            startTimestamp: '2026-08-27T15:00Z',
            endTimestamp: '2026-08-27T15:30Z',
          },
        ],
        'RUNNER-1'
      )
    ).toEqual([
      {
        startTimestamp: '2026-08-27T15:00Z',
        endTimestamp: '2026-08-27T15:30Z',
      },
      {
        startTimestamp: '2026-08-27T15:30Z',
        endTimestamp: '2026-08-27T16:00Z',
      },
    ]);
    expect(() => selectRunnerCommitmentProjection(null, 'RUNNER-1')).toThrow(
      'invalid-projection-records'
    );
    expect(() =>
      selectRunnerCommitmentProjection([{ personId: 'RUNNER-2' }], 'RUNNER-1')
    ).toThrow('invalid-person-id');
    expect(() =>
      selectRunnerCommitmentProjection(
        [
          {
            personId: 'RUNNER-1',
            startTimestamp: 'invalid',
            endTimestamp: '2030-01-01T11:00:00Z',
          },
        ],
        'RUNNER-1'
      )
    ).toThrow('invalid-start-timestamp');
    expect(() =>
      selectRunnerCommitmentProjection(
        [
          {
            personId: 'RUNNER-1',
            startTimestamp: '2030-01-01T10:00:00Z',
            endTimestamp: 'invalid',
          },
        ],
        'RUNNER-1'
      )
    ).toThrow('invalid-end-timestamp');
    expect(() =>
      selectRunnerCommitmentProjection(
        [
          {
            personId: 'RUNNER-1',
            startTimestamp: '2030-01-01T11:00:00Z',
            endTimestamp: '2030-01-01T10:00:00Z',
          },
        ],
        'RUNNER-1'
      )
    ).toThrow('reversed-commitment-interval');
  });

  test('defaults absent in-memory collections to an empty repository', async () => {
    await expect(
      createBrowserRunnerCommitmentsRepository().listForRunner({
        runnerId: 'RUNNER-1',
      })
    ).resolves.toEqual([]);
    await expect(
      createBrowserRunnerCommitmentsRepository({}).listForRunner({
        runnerId: 'RUNNER-1',
      })
    ).resolves.toEqual([]);
  });
  test('rejects invalid projection inputs and incomplete records', async () => {
    await expect(
      projectRunnerCommitments({
        assignments: null,
        selectAssignments: createRunnerAssignmentSelector('RUNNER-1'),
        resolveSegment: async () => null,
        resolvePoint: async () => null,
      })
    ).rejects.toThrow('invalid-assignments');
    await expect(
      projectRunnerCommitments({
        assignments: [{ personId: 'OTHER', segmentId: 'SEGMENT-1' }],
        selectAssignments: createRunnerAssignmentSelector('RUNNER-1', true),
        resolveSegment: async () => segment,
        resolvePoint: async pointId =>
          points.find(point => point.pointId === pointId),
      })
    ).rejects.toThrow('invalid-person-id');
    await expect(
      projectRunnerCommitments({
        assignments: [{ personId: 'RUNNER-1', segmentId: '' }],
        selectAssignments: createRunnerAssignmentSelector('RUNNER-1'),
        resolveSegment: async () => segment,
        resolvePoint: async () => points[0],
      })
    ).rejects.toThrow('missing-segment-id');
    await expect(
      projectRunnerCommitments({
        assignments: [{ personId: 'RUNNER-1', segmentId: 'SEGMENT-1' }],
        selectAssignments: createRunnerAssignmentSelector('RUNNER-1'),
        resolveSegment: async () => null,
        resolvePoint: async () => points[0],
      })
    ).rejects.toThrow('missing-segment');
  });

  test('rejects missing segment and point identifiers', async () => {
    await expect(
      projectRunnerCommitments({
        assignments: [assignment],
        selectAssignments: createRunnerAssignmentSelector('RUNNER-1'),
        resolveSegment: async () => ({ endPointId: 'POINT-2' }),
        resolvePoint: async () => points[0],
      })
    ).rejects.toThrow('missing-start-point-id');
    await expect(
      projectRunnerCommitments({
        assignments: [assignment],
        selectAssignments: createRunnerAssignmentSelector('RUNNER-1'),
        resolveSegment: async () => ({ startPointId: 'POINT-1' }),
        resolvePoint: async () => points[0],
      })
    ).rejects.toThrow('missing-end-point-id');
    await expect(
      projectRunnerCommitments({
        assignments: [assignment],
        selectAssignments: createRunnerAssignmentSelector('RUNNER-1'),
        resolveSegment: async () => segment,
        resolvePoint: async pointId =>
          pointId === 'POINT-1' ? { timestamp: 'not-a-time' } : points[1],
      })
    ).rejects.toThrow('invalid-start-timestamp');
  });

  test('sorts intervals by end time when starts are equal', async () => {
    await expect(
      projectRunnerCommitments({
        assignments: [assignment, { ...assignment, segmentId: 'SEGMENT-2' }],
        selectAssignments: createRunnerAssignmentSelector('RUNNER-1'),
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
    const documents = {
      'SEGMENT-1': segment,
      'POINT-1': points[0],
      'POINT-2': points[1],
    };
    const getAll = jest.fn(async (...references) =>
      references.map(({ id }) => ({ id, data: () => documents[id] }))
    );
    const whereGet = jest.fn(async () => ({
      docs: [{ data: () => assignment }],
    }));
    const where = jest.fn(() => ({ get: whereGet }));
    const db = {
      collection: jest.fn(name => {
        if (name === 'runner_assignments') return { where };
        return { doc: id => ({ id }) };
      }),
      getAll,
    };
    const repository = createFirestoreRunnerCommitmentsRepository({ db });
    await expect(
      repository.listForRunner(allowEffects, { runnerId: 'RUNNER-1' })
    ).resolves.toEqual([
      {
        startTimestamp: '2026-08-27T15:00Z',
        endTimestamp: '2026-08-27T15:30Z',
      },
    ]);
    expect(db.collection).toHaveBeenCalledWith('runner_assignments');
    expect(where).toHaveBeenCalledWith('personId', '==', 'RUNNER-1');
    expect(whereGet).toHaveBeenCalledTimes(1);
    expect(getAll).toHaveBeenCalledTimes(2);
  });

  test('keeps Firestore reads bounded for 100 runner commitments', async () => {
    const assignments = Array.from({ length: 100 }, (_, index) => ({
      personId: 'RUNNER-1',
      segmentId: `SEGMENT-${index}`,
    }));
    const documents = new Map();
    assignments.forEach((record, index) => {
      documents.set(record.segmentId, {
        startPointId: `START-${index}`,
        endPointId: `END-${index}`,
      });
      documents.set(`START-${index}`, {
        timestamp: `2026-08-27T15:${String(index % 60).padStart(2, '0')}:00Z`,
      });
      documents.set(`END-${index}`, {
        timestamp: `2026-08-27T16:${String(index % 60).padStart(2, '0')}:00Z`,
      });
    });
    const getAll = jest.fn(async (...references) =>
      references.map(({ id }) => ({ id, data: () => documents.get(id) }))
    );
    const whereGet = jest.fn(async () => ({
      docs: assignments.map(value => ({ data: () => value })),
    }));
    const where = jest.fn(() => ({ get: whereGet }));
    const db = {
      collection: jest.fn(name =>
        name === 'runner_assignments' ? { where } : { doc: id => ({ id }) }
      ),
      getAll,
    };

    const result = await createFirestoreRunnerCommitmentsRepository({
      db,
    }).listForRunner(allowEffects, { runnerId: 'RUNNER-1' });

    expect(result).toHaveLength(100);
    expect(where).toHaveBeenCalledTimes(1);
    expect(where).toHaveBeenCalledWith('personId', '==', 'RUNNER-1');
    expect(whereGet).toHaveBeenCalledTimes(1);
    expect(getAll).toHaveBeenCalledTimes(2);
    expect(
      getAll.mock.calls.map(([...references]) => references.length)
    ).toEqual([100, 200]);
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
      serviceArea: SOPHIE_CHARLOTTE_SERVICE_AREA,
    });
    await expect(
      search(allowEffects, {
        requestText: 'football',
        deliveryPoint: {
          timestamp: '2026-08-27T19:00Z',
          latitude: 52.510833,
          longitude: 13.296667,
        },
        pickupPoint: {
          timestamp: '2026-08-27T20:00Z',
          latitude: 52.510833,
          longitude: 13.296667,
        },
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
    expect(listForRunner).toHaveBeenCalledWith(allowEffects, {
      runnerId: 'RUNNER-9',
    });
  });
});
