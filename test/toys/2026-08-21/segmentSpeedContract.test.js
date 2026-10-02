import { expect, test } from '@jest/globals';
import { segmentMaximumSpeedFeasibility } from '../../../src/core/browser/toys/2026-08-21/segmentMaximumSpeedFeasibility.js';
import { resolveSpeed } from '../../../src/core/browser/toys/2026-08-22/strictAssignmentCore.js';
import { assignAssetAndCustodianToSegmentIfFeasible } from '../../../src/core/browser/toys/2026-08-21/assignAssetAndCustodianToSegmentIfFeasible.js';
import { validatedAssetCustodianSegmentAssignment } from '../../../src/core/browser/toys/2026-08-22/validatedAssetCustodianSegmentAssignment.js';

/**
 * Build a two-point candidate with a controlled distance and duration.
 * @param {number} seconds Duration.
 * @param {number} longitude Destination longitude.
 * @returns {object} Speed request.
 */
function request(seconds, longitude) {
  const origin = Date.parse('2026-10-02T08:00:00Z');
  return {
    points: [
      {
        pointId: 'A',
        latitude: 0,
        longitude: 0,
        timestamp: new Date(origin).toISOString(),
      },
      {
        pointId: 'B',
        latitude: 0,
        longitude,
        timestamp: new Date(origin + seconds * 1000).toISOString(),
      },
    ],
    candidateSegment: { segmentId: 'AB', startPointId: 'A', endPointId: 'B' },
    maximumSpeed: 1000,
  };
}

test('strict and public speed results agree on finite duration and unit conversion', () => {
  const input = request(3600, 0.001);
  const strict = resolveSpeed(input);
  const publicResult = JSON.parse(
    segmentMaximumSpeedFeasibility(JSON.stringify(input))
  );
  expect(publicResult.feasible).toBe(true);
  expect(publicResult.durationSeconds).toBe(3600);
  expect(publicResult.requiredSpeedKilometersPerHour).toBeCloseTo(
    publicResult.distanceMeters / 1000,
    12
  );
  expect(strict.requiredSpeed).toBe(
    publicResult.requiredSpeedKilometersPerHour
  );
  expect(resolveSpeed(request(7200, 0.001)).requiredSpeed).toBe(
    strict.requiredSpeed / 2
  );
});

test('zero-time stationary segments require no speed', () => {
  const input = request(0, 0);
  expect(resolveSpeed(input).requiredSpeed).toBe(0);
  expect(
    JSON.parse(segmentMaximumSpeedFeasibility(JSON.stringify(input)))
  ).toMatchObject({
    feasible: true,
    durationSeconds: 0,
    requiredSpeedKilometersPerHour: 0,
  });
});

test('zero-time moving segments require infinity and reject finite limits', () => {
  const input = request(0, 0.001);
  expect(resolveSpeed(input).requiredSpeed).toBe(Infinity);
  expect(
    JSON.parse(segmentMaximumSpeedFeasibility(JSON.stringify(input)))
  ).toMatchObject({
    feasible: false,
    durationSeconds: 0,
    requiredSpeedKilometersPerHour: null,
  });
});

test('legacy combined assignments retain their different zero-duration policy', () => {
  const input = request(0, 0.001);
  const env = new Map([
    ['getData', () => ({})],
    ['setLocalTemporaryData', () => {}],
  ]);
  const result = JSON.parse(
    assignAssetAndCustodianToSegmentIfFeasible(
      JSON.stringify({
        ...input,
        assetId: 'asset',
        custodianPersonId: 'runner',
        stockInPoint: input.points[0],
        stockOutPoint: input.points[1],
        shifts: [
          {
            shiftId: 'shift',
            clockInPoint: input.points[0],
            clockOutPoint: input.points[1],
          },
        ],
        maximumSpeedKilometersPerHour: 0,
      }),
      env
    )
  );
  expect(result.committed).toBe(true);
});

test.each([
  [assignAssetAndCustodianToSegmentIfFeasible, true],
  [assignAssetAndCustodianToSegmentIfFeasible, false],
  [validatedAssetCustodianSegmentAssignment, true],
  [validatedAssetCustodianSegmentAssignment, false],
])(
  'combined writer %p commits both collections atomically (custom paths: %p)',
  (writer, customPaths) => {
    const base = request(3600, 0.001);
    let stored;
    let writes = 0;
    const env = new Map([
      ['getData', () => ({ unrelated: true })],
      [
        'setLocalTemporaryData',
        next => {
          stored = next;
          writes++;
        },
      ],
    ]);
    const result = JSON.parse(
      writer(
        JSON.stringify({
          ...base,
          assetId: 17,
          custodianPersonId: 23,
          assetPath: customPaths ? 'assets' : undefined,
          personPath: customPaths ? 'runners' : undefined,
          maximumSpeedKilometersPerHour: 1000,
          stockInPoint: base.points[0],
          stockOutPoint: base.points[1],
          shifts: [
            { clockInPoint: base.points[0], clockOutPoint: base.points[1] },
          ],
        }),
        env
      )
    );
    expect(result).toEqual({ committed: true, lengths: [1, 1] });
    expect(writes).toBe(1);
    expect(stored).toEqual({
      unrelated: true,
      temporary: {
        [customPaths ? 'assets' : 'assetSegmentAssignments']: [
          { assetId: '17', segmentId: 'AB' },
        ],
        [customPaths ? 'runners' : 'personSegmentAssignments']: [
          { personId: '23', segmentId: 'AB' },
        ],
      },
    });
  }
);
