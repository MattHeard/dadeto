import { describe, expect, test } from '@jest/globals';
import { segmentAssignmentFeasibility } from '../../../src/core/browser/toys/2026-08-21/segmentAssignmentFeasibility.js';
import { runnerShiftSegmentFeasibility } from '../../../src/core/browser/toys/2026-08-21/runnerShiftSegmentFeasibility.js';
import { segmentMaximumSpeedFeasibility } from '../../../src/core/browser/toys/2026-08-21/segmentMaximumSpeedFeasibility.js';
import { assignAssetToSegmentIfFeasible } from '../../../src/core/browser/toys/2026-08-21/assignAssetToSegmentIfFeasible.js';
import { assignRunnerToSegmentIfFeasible } from '../../../src/core/browser/toys/2026-08-21/assignRunnerToSegmentIfFeasible.js';
import { assignAssetAndCustodianToSegmentIfFeasible } from '../../../src/core/browser/toys/2026-08-21/assignAssetAndCustodianToSegmentIfFeasible.js';
import {
  evaluateWorldLine,
  overlaps,
} from '../../../src/core/browser/toys/2026-08-21/segmentAssignmentFeasibilityCore.js';
import { appendAtomically } from '../../../src/core/browser/toys/2026-08-21/safeAssignmentPersistence.js';
/* eslint-disable jsdoc/require-returns, jsdoc/require-param-description, jsdoc/require-param-type */

const points = [
  {
    pointId: 'E',
    latitude: 0,
    longitude: 0,
    timestamp: '2026-01-01T00:00:00Z',
  },
  {
    pointId: 'A',
    latitude: 0,
    longitude: 0,
    timestamp: '2026-01-01T01:00:00Z',
  },
  {
    pointId: 'B',
    latitude: 0,
    longitude: 0.001,
    timestamp: '2026-01-01T02:00:00Z',
  },
  {
    pointId: 'C',
    latitude: 0,
    longitude: 0.002,
    timestamp: '2026-01-01T03:00:00Z',
  },
  {
    pointId: 'Y',
    latitude: 1,
    longitude: 1,
    timestamp: '2026-01-01T02:00:00Z',
  },
  {
    pointId: 'X',
    latitude: 1,
    longitude: 1,
    timestamp: '2026-01-01T03:00:00Z',
  },
  {
    pointId: 'D',
    latitude: 0,
    longitude: 0.001,
    timestamp: '2026-01-01T04:00:00Z',
  },
];
const candidate = { segmentId: 'AB', startPointId: 'A', endPointId: 'B' };
const shift = {
  shiftId: 'shift-1',
  clockInPoint: points[0],
  clockOutPoint: points[2],
};
const request = extra =>
  JSON.stringify({ points, candidateSegment: candidate, ...extra });

/**
 *
 * @param initial
 */
function env(initial = {}) {
  const state = { temporary: initial };
  return {
    state,
    env: new Map([
      ['getData', () => state],
      ['setLocalTemporaryData', next => Object.assign(state, next)],
      ['getLocalPermanentData', () => state.permanent || {}],
      [
        'setLocalPermanentData',
        next => {
          state.permanent = next;
        },
      ],
    ]),
  };
}

describe('safe assignment toys', () => {
  test('handles omitted optional collections and writer fields', () => {
    for (const toy of [
      segmentAssignmentFeasibility,
      runnerShiftSegmentFeasibility,
      segmentMaximumSpeedFeasibility,
      assignAssetToSegmentIfFeasible,
      assignRunnerToSegmentIfFeasible,
      assignAssetAndCustodianToSegmentIfFeasible,
    ]) {
      expect(typeof toy('{}', env().env)).toBe('string');
    }
  });

  test('world-line feasibility allows stationary gaps at the same location', () => {
    const result = JSON.parse(
      segmentAssignmentFeasibility(
        request({
          existingSegments: [
            { segmentId: 'BC', startPointId: 'B', endPointId: 'C' },
          ],
          entryPoint: points[0],
        })
      )
    );
    expect(result.feasible).toBe(true);
  });

  test('world-line ordering uses stable IDs for equal start times', () => {
    const result = JSON.parse(
      segmentAssignmentFeasibility(
        request({
          existingSegments: [
            { segmentId: 'AA2', startPointId: 'A', endPointId: 'A' },
          ],
          entryPoint: points[0],
        })
      )
    );
    expect(result.feasible).toBe(true);
  });

  test('world-line feasibility rejects equal-time teleportation and overlaps', () => {
    const teleport = JSON.parse(
      segmentAssignmentFeasibility(
        request({
          existingSegments: [
            { segmentId: 'YC', startPointId: 'Y', endPointId: 'C' },
          ],
          entryPoint: points[0],
        })
      )
    );
    const overlap = JSON.parse(
      segmentAssignmentFeasibility(
        request({
          existingSegments: [
            { segmentId: 'EB', startPointId: 'E', endPointId: 'B' },
          ],
          entryPoint: points[0],
        })
      )
    );
    expect(teleport.feasible).toBe(false);
    expect(overlap.feasible).toBe(false);
  });

  test('shift feasibility accepts boundaries and rejects crossing shifts', () => {
    expect(
      JSON.parse(runnerShiftSegmentFeasibility(request({ shifts: [shift] })))
        .feasible
    ).toBe(true);
    const crossing = { segmentId: 'AD', startPointId: 'A', endPointId: 'D' };
    expect(
      JSON.parse(
        runnerShiftSegmentFeasibility(
          JSON.stringify({
            points,
            candidateSegment: crossing,
            shifts: [shift],
          })
        )
      ).feasible
    ).toBe(false);
    expect(
      JSON.parse(runnerShiftSegmentFeasibility(request({}))).feasible
    ).toBe(false);
  });

  test('maximum-speed feasibility handles exact, excessive, and zero-duration cases', () => {
    expect(
      JSON.parse(segmentMaximumSpeedFeasibility(request({ maximumSpeed: 1 })))
        .feasible
    ).toBe(true);
    expect(
      JSON.parse(
        segmentMaximumSpeedFeasibility(request({ maximumSpeed: 0.0001 }))
      ).feasible
    ).toBe(false);
    const zero = { segmentId: 'AA', startPointId: 'A', endPointId: 'A' };
    expect(
      JSON.parse(
        segmentMaximumSpeedFeasibility(
          JSON.stringify({ points, candidateSegment: zero, maximumSpeed: 0 })
        )
      ).feasible
    ).toBe(true);
    const zeroDistance = {
      pointId: 'Z',
      latitude: 0,
      longitude: 0.5,
      timestamp: points[1].timestamp,
    };
    expect(
      JSON.parse(
        segmentMaximumSpeedFeasibility(
          JSON.stringify({
            points: [...points, zeroDistance],
            candidateSegment: {
              segmentId: 'AZ',
              startPointId: 'A',
              endPointId: 'Z',
            },
            maximumSpeed: 0,
          })
        )
      ).feasible
    ).toBe(false);
  });

  test('asset and runner writers append only after feasibility', () => {
    const asset = env();
    expect(
      JSON.parse(
        assignAssetToSegmentIfFeasible(
          request({ assetId: 'asset-1', stockInPoint: points[0] }),
          asset.env
        )
      ).appended
    ).toBe(true);
    expect(asset.state.temporary.assetSegmentAssignments).toHaveLength(1);
    const runner = env();
    expect(
      JSON.parse(
        assignRunnerToSegmentIfFeasible(
          request({
            personId: 'person-1',
            shifts: [shift],
            maximumSpeedKilometersPerHour: 1,
            entryPoint: points[0],
          }),
          runner.env
        )
      ).appended
    ).toBe(true);
    const teleportPoint = {
      pointId: 'T',
      latitude: 1,
      longitude: 1,
      timestamp: points[1].timestamp,
    };
    const teleportRequest = JSON.stringify({
      points: [...points, teleportPoint],
      candidateSegment: { segmentId: 'AT', startPointId: 'A', endPointId: 'T' },
      shifts: [
        {
          shiftId: 'teleport',
          clockInPoint: points[1],
          clockOutPoint: teleportPoint,
        },
      ],
      maximumSpeedKilometersPerHour: 1,
      entryPoint: points[1],
    });
    expect(
      JSON.parse(assignRunnerToSegmentIfFeasible(teleportRequest, env().env))
        .reason
    ).toBe('excessive-speed');
    const runnerFailure = JSON.parse(
      assignRunnerToSegmentIfFeasible(
        request({
          existingSegments: [
            { segmentId: 'YC', startPointId: 'Y', endPointId: 'C' },
          ],
          shifts: [shift],
          maximumSpeedKilometersPerHour: 1,
          entryPoint: points[0],
        }),
        env().env
      )
    );
    expect(runnerFailure.appended).toBe(false);
  });

  test('combined writer commits both lists or neither', () => {
    const value = env();
    const result = JSON.parse(
      assignAssetAndCustodianToSegmentIfFeasible(
        request({
          assetId: 'asset-1',
          custodianPersonId: 'person-1',
          stockInPoint: points[0],
          shifts: [shift],
          maximumSpeedKilometersPerHour: 1,
        }),
        value.env
      )
    );
    expect(result.committed).toBe(true);
    expect(value.state.temporary.assetSegmentAssignments).toHaveLength(1);
    expect(value.state.temporary.personSegmentAssignments).toHaveLength(1);
    const rejected = env();
    const failure = JSON.parse(
      assignAssetAndCustodianToSegmentIfFeasible(
        request({
          assetId: 'asset-1',
          custodianPersonId: 'person-1',
          stockInPoint: points[0],
          shifts: [],
          maximumSpeedKilometersPerHour: 1,
        }),
        rejected.env
      )
    );
    expect(failure.committed).toBe(false);
    expect(rejected.state.temporary).toEqual({});
  });
});

describe('safe assignment toy edge cases', () => {
  test('overlap helper distinguishes positive intersections from touching intervals', () => {
    expect(
      overlaps({ startTime: 0, endTime: 10 }, { startTime: 5, endTime: 15 })
    ).toBe(true);
    expect(
      overlaps({ startTime: 0, endTime: 10 }, { startTime: 10, endTime: 15 })
    ).toBe(false);
  });
  test('feasibility reports malformed, disconnected, overlapping, and bounded lines', () => {
    expect(JSON.parse(segmentAssignmentFeasibility('not-json')).feasible).toBe(
      false
    );
    const unknown = JSON.parse(
      segmentAssignmentFeasibility(
        request({
          candidateSegment: { segmentId: 'nope' },
          entryPoint: points[0],
        })
      )
    );
    expect(unknown.reason).toMatch(/unknown point/);
    const invalid = JSON.parse(
      segmentAssignmentFeasibility(
        JSON.stringify({
          points: [{ pointId: 'A', timestamp: 'bad' }],
          candidateSegment: {
            segmentId: 'AB',
            startPointId: 'A',
            endPointId: 'A',
          },
          entryPoint: { pointId: 'A', timestamp: 'bad' },
        })
      )
    );
    expect(invalid.reason).toMatch(/ordered valid interval/);
    const beforeEntry = JSON.parse(
      segmentAssignmentFeasibility(request({ entryPoint: points[2] }))
    );
    expect(beforeEntry.reason).toBe('before-entry');
    const exitFailure = JSON.parse(
      segmentAssignmentFeasibility(
        request({ entryPoint: points[0], exitPoint: points[5] })
      )
    );
    expect(exitFailure.reason).toBe('exit-discontinuity');
    const afterExit = JSON.parse(
      segmentAssignmentFeasibility(
        request({ entryPoint: points[0], exitPoint: points[0] })
      )
    );
    expect(afterExit.reason).toBe('after-exit');
  });

  test('assignment feasibility handles missing anchors and invalid exits', () => {
    const missingEntry = JSON.parse(
      segmentAssignmentFeasibility(request({ entryPoint: undefined }))
    );
    expect(missingEntry.reason).toBe('missing-entry-point');
    const invalidExit = JSON.parse(
      segmentAssignmentFeasibility(
        request({
          entryPoint: points[0],
          exitPoint: { pointId: 'Z', timestamp: 'bad' },
        })
      )
    );
    expect(invalidExit.reason).toBe('invalid-exit-point');
    const overlap = JSON.parse(
      segmentAssignmentFeasibility(
        request({
          existingSegments: [
            { segmentId: 'EB', startPointId: 'E', endPointId: 'B' },
          ],
          entryPoint: points[0],
        })
      )
    );
    expect(overlap.reason).toBe('temporal-overlap');
  });
});

describe('safe assignment persistence edge cases', () => {
  test('speed and shift toys reject invalid input and boundaries', () => {
    expect(
      JSON.parse(segmentMaximumSpeedFeasibility('not-json')).feasible
    ).toBe(false);
    expect(
      JSON.parse(segmentMaximumSpeedFeasibility(request({ maximumSpeed: -1 })))
        .reason
    ).toMatch(/non-negative/);
    expect(
      JSON.parse(runnerShiftSegmentFeasibility(request({ shifts: [] }))).reason
    ).toBe('outside-shift');
    expect(
      JSON.parse(
        runnerShiftSegmentFeasibility(
          request({
            shifts: [
              { clockInPoint: { timestamp: 'bad' }, clockOutPoint: points[2] },
            ],
          })
        )
      ).reason
    ).toMatch(/Invalid shift point/);
  });

  test('writers preserve atomicity across rejection, permanent storage, and bad paths', () => {
    const rejected = env();
    expect(
      JSON.parse(
        assignAssetToSegmentIfFeasible(
          request({ stockInPoint: points[5] }),
          rejected.env
        )
      ).appended
    ).toBe(false);
    const permanent = env();
    expect(
      JSON.parse(
        assignAssetToSegmentIfFeasible(
          request({
            assetId: 'a',
            stockInPoint: points[0],
            memoryLocation: 'permanent',
          }),
          permanent.env
        )
      ).appended
    ).toBe(true);
    expect(() =>
      assignAssetToSegmentIfFeasible(
        request({
          stockInPoint: points[0],
          path: 'assetSegmentAssignments.value',
        }),
        env().env
      )
    ).not.toThrow();
    const badLocation = JSON.parse(
      assignRunnerToSegmentIfFeasible(
        request({ shifts: [shift], memoryLocation: 'bad' }),
        env().env
      )
    );
    expect(badLocation.appended).toBe(false);
  });

  test('all toys handle omitted optional collections and malformed requests', () => {
    expect(JSON.parse(segmentAssignmentFeasibility('')).feasible).toBe(false);
    expect(JSON.parse(runnerShiftSegmentFeasibility('')).feasible).toBe(false);
    expect(JSON.parse(segmentMaximumSpeedFeasibility('')).feasible).toBe(false);
    expect(
      JSON.parse(assignAssetToSegmentIfFeasible('', env().env)).appended
    ).toBe(false);
    expect(
      JSON.parse(assignRunnerToSegmentIfFeasible('', env().env)).appended
    ).toBe(false);
    expect(
      JSON.parse(assignAssetAndCustodianToSegmentIfFeasible('', env().env))
        .committed
    ).toBe(false);
    expect(JSON.parse(segmentAssignmentFeasibility('{}')).feasible).toBe(false);
    expect(JSON.parse(runnerShiftSegmentFeasibility('{}')).feasible).toBe(
      false
    );
    expect(JSON.parse(segmentMaximumSpeedFeasibility('{}')).feasible).toBe(
      false
    );
    expect(
      JSON.parse(assignAssetToSegmentIfFeasible('{}', env().env)).appended
    ).toBe(false);
    expect(
      JSON.parse(assignRunnerToSegmentIfFeasible('{}', env().env)).appended
    ).toBe(false);
    expect(
      JSON.parse(assignAssetAndCustodianToSegmentIfFeasible('{}', env().env))
        .committed
    ).toBe(false);
    expect(
      evaluateWorldLine(points, [], candidate, {
        ...points[0],
        pointId: 'missing',
        latitude: 99,
      }).reason
    ).toBe('entry-discontinuity');
    expect(
      evaluateWorldLine(points, [], candidate, {
        ...points[0],
        timestamp: 'bad',
      }).reason
    ).toBe('invalid-entry-point');
    const noTemporary = { state: {}, env: env().env };
    expect(() =>
      appendAtomically(
        'temporary',
        [{ path: 'items', object: { id: 1 } }],
        noTemporary.env
      )
    ).not.toThrow();
    expect(() =>
      appendAtomically(
        'envelope',
        [{ path: 'items', object: { id: 1 } }],
        env().env
      )
    ).not.toThrow();
    const nullDataEnv = new Map([
      ['getData', () => null],
      ['setLocalTemporaryData', () => {}],
      ['getLocalPermanentData', () => null],
      ['setLocalPermanentData', () => {}],
    ]);
    expect(() =>
      appendAtomically(
        'temporary',
        [{ path: 'items', object: {} }],
        nullDataEnv
      )
    ).not.toThrow();
    expect(() =>
      appendAtomically(
        'permanent',
        [{ path: 'items', object: {} }],
        nullDataEnv
      )
    ).not.toThrow();
    expect(() =>
      appendAtomically(
        'temporary',
        [{ path: 'items', object: {} }],
        env({ items: {} }).env
      )
    ).toThrow(/Path is not a list/);
  });

  test('assignment writers reject each feasible-stage failure', () => {
    const assetFailure = JSON.parse(
      assignAssetAndCustodianToSegmentIfFeasible(
        request({
          stockInPoint: points[5],
          shifts: [shift],
          maximumSpeedKilometersPerHour: 1,
        }),
        env().env
      )
    );
    expect(assetFailure.reason).toMatch(/^asset:/);
    const runnerFailure = JSON.parse(
      assignAssetAndCustodianToSegmentIfFeasible(
        request({
          stockInPoint: points[0],
          shifts: [shift],
          existingPersonSegments: [
            { segmentId: 'YC', startPointId: 'Y', endPointId: 'C' },
          ],
          maximumSpeedKilometersPerHour: 1,
        }),
        env().env
      )
    );
    expect(runnerFailure.reason).toMatch(/^runner:/);
    const excessive = JSON.parse(
      assignAssetAndCustodianToSegmentIfFeasible(
        request({
          stockInPoint: points[0],
          shifts: [shift],
          maximumSpeedKilometersPerHour: 0,
        }),
        env().env
      )
    );
    expect(excessive.reason).toBe('excessive-speed');
    const runnerExcessive = JSON.parse(
      assignRunnerToSegmentIfFeasible(
        request({ shifts: [shift], maximumSpeedKilometersPerHour: 0 }),
        env().env
      )
    );
    expect(runnerExcessive.reason).toBe('excessive-speed');
  });

  test('world-line evaluation reports exit and temporal boundary failures', () => {
    expect(
      evaluateWorldLine(points, [], candidate, points[0], {
        ...points[3],
        timestamp: 'bad',
      }).reason
    ).toBe('invalid-exit-point');
    expect(
      evaluateWorldLine(points, [], candidate, points[0], {
        ...points[2],
        pointId: 'different',
        latitude: 9,
      }).reason
    ).toBe('exit-discontinuity');
    expect(
      evaluateWorldLine(points, [], candidate, points[0], {
        ...points[0],
        timestamp: '2026-01-01T00:30:00Z',
      }).reason
    ).toBe('after-exit');
    expect(
      evaluateWorldLine(
        points,
        [{ segmentId: 'bad', startPointId: 'Y', endPointId: 'C' }],
        candidate,
        points[0]
      ).reason
    ).toBe('world-line-discontinuity');
  });

  test('assignment writers exercise omitted optional collections and defaults after resolution', () => {
    expect(
      JSON.parse(
        assignRunnerToSegmentIfFeasible(
          request({ candidateSegment: candidate }),
          env().env
        )
      ).reason
    ).toBe('outside-shift');
    expect(
      JSON.parse(
        assignAssetAndCustodianToSegmentIfFeasible(
          request({ candidateSegment: candidate }),
          env().env
        )
      ).reason
    ).toBe('outside-shift');
  });

  test('writers handle zero-duration stationary assignments', () => {
    const zero = { segmentId: 'AA', startPointId: 'A', endPointId: 'A' };
    const zeroShift = {
      shiftId: 'zero',
      clockInPoint: points[1],
      clockOutPoint: points[1],
    };
    expect(
      JSON.parse(
        assignRunnerToSegmentIfFeasible(
          request({
            candidateSegment: zero,
            shifts: [zeroShift],
            maximumSpeedKilometersPerHour: 0,
          }),
          env().env
        )
      ).appended
    ).toBe(true);
    expect(
      JSON.parse(
        assignAssetAndCustodianToSegmentIfFeasible(
          request({
            candidateSegment: zero,
            shifts: [zeroShift],
            stockInPoint: points[1],
            stockOutPoint: points[1],
            maximumSpeedKilometersPerHour: 0,
          }),
          env().env
        )
      ).committed
    ).toBe(true);
  });
});
/* eslint max-lines-per-function: off */
