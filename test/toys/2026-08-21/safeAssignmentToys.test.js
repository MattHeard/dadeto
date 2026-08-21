import { describe, expect, test } from '@jest/globals';
import { segmentAssignmentFeasibility } from '../../../src/core/browser/toys/2026-08-21/segmentAssignmentFeasibility.js';
import { runnerShiftSegmentFeasibility } from '../../../src/core/browser/toys/2026-08-21/runnerShiftSegmentFeasibility.js';
import { segmentMaximumSpeedFeasibility } from '../../../src/core/browser/toys/2026-08-21/segmentMaximumSpeedFeasibility.js';
import { assignAssetToSegmentIfFeasible } from '../../../src/core/browser/toys/2026-08-21/assignAssetToSegmentIfFeasible.js';
import { assignRunnerToSegmentIfFeasible } from '../../../src/core/browser/toys/2026-08-21/assignRunnerToSegmentIfFeasible.js';
import { assignAssetAndCustodianToSegmentIfFeasible } from '../../../src/core/browser/toys/2026-08-21/assignAssetAndCustodianToSegmentIfFeasible.js';
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
