import { describe, expect, test } from '@jest/globals';
import { validatedAssetSegmentAssignment } from '../../../src/core/browser/toys/2026-08-22/validatedAssetSegmentAssignment.js';
import { validatedRunnerSegmentAssignment } from '../../../src/core/browser/toys/2026-08-22/validatedRunnerSegmentAssignment.js';
import { validatedAssetCustodianSegmentAssignment } from '../../../src/core/browser/toys/2026-08-22/validatedAssetCustodianSegmentAssignment.js';
import {
  buildPoints,
  normalizeMaximumSpeed,
} from '../../../src/core/browser/toys/2026-08-22/strictAssignmentCore.js';

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
];
const candidateSegment = {
  segmentId: 'AB',
  startPointId: 'A',
  endPointId: 'B',
};
const shift = {
  shiftId: 'shift-1',
  clockInPoint: points[0],
  clockOutPoint: points[2],
};
const base = {
  points,
  candidateSegment,
  stockInPoint: points[0],
  shifts: [shift],
  maximumSpeed: 1,
};

/**
 *
 * @param setter
 */
/**
 * Build a storage fixture.
 * @param {(next: Record<string, unknown>) => void|undefined} setter Optional setter override.
 * @returns {{state: Record<string, any>, env: Map<string, Function>}} Fixture.
 */
function fixture(setter) {
  const state = { temporary: {} };
  setter ||= next => Object.assign(state, next);
  const env = new Map([
    ['getData', () => state],
    ['setLocalTemporaryData', setter],
    ['getLocalPermanentData', () => state.permanent || {}],
    [
      'setLocalPermanentData',
      next => {
        state.permanent = next;
      },
    ],
  ]);
  return { state, env };
}

describe('validated superseding assignment toys', () => {
  test('empty and structurally incomplete requests fail safely', () => {
    expect(
      JSON.parse(
        validatedAssetCustodianSegmentAssignment(
          JSON.stringify({}),
          fixture().env
        )
      )
    ).toMatchObject({
      committed: false,
      reason: 'invalid-asset-id',
    });
    expect(
      JSON.parse(validatedAssetCustodianSegmentAssignment('', fixture().env))
    ).toMatchObject({
      committed: false,
      reason: 'invalid-asset-id',
    });
    expect(
      JSON.parse(
        validatedAssetSegmentAssignment(JSON.stringify({}), fixture().env)
      )
    ).toMatchObject({
      appended: false,
      reason: 'invalid-asset-id',
    });
    expect(
      JSON.parse(validatedAssetSegmentAssignment('', fixture().env))
    ).toMatchObject({
      appended: false,
      reason: 'invalid-asset-id',
    });
    expect(
      JSON.parse(validatedRunnerSegmentAssignment('', fixture().env))
    ).toMatchObject({
      appended: false,
      reason: 'invalid-person-id',
    });
    expect(
      JSON.parse(
        validatedRunnerSegmentAssignment(
          JSON.stringify({ personId: 'P1', candidateSegment, maximumSpeed: 1 }),
          fixture().env
        )
      )
    ).toMatchObject({ appended: false, feasible: false });
    expect(
      JSON.parse(
        validatedAssetCustodianSegmentAssignment(
          JSON.stringify({
            assetId: 'A1',
            custodianPersonId: 'P1',
            candidateSegment,
            maximumSpeed: 1,
          }),
          fixture().env
        )
      )
    ).toMatchObject({ committed: false });

    expect(
      JSON.parse(
        validatedAssetSegmentAssignment(
          JSON.stringify({ assetId: 'A1', candidateSegment }),
          fixture().env
        )
      )
    ).toMatchObject({ appended: false });
  });

  test('covers assignment boundary rejections and zero-duration speeds', () => {
    const outside = fixture();
    expect(
      JSON.parse(
        validatedRunnerSegmentAssignment(
          JSON.stringify({ ...base, personId: 'P1', shifts: [] }),
          outside.env
        )
      ).reason
    ).toBe('outside-shift');
    expect(
      JSON.parse(
        validatedRunnerSegmentAssignment(
          JSON.stringify({ ...base, personId: 'P1', shifts: undefined }),
          fixture().env
        )
      ).reason
    ).toBe('outside-shift');
    expect(
      JSON.parse(
        validatedRunnerSegmentAssignment(
          JSON.stringify({
            ...base,
            personId: 'P1',
            candidateSegment: { ...candidateSegment, segmentId: '' },
          }),
          fixture().env
        )
      ).reason
    ).toBe('invalid-segment-id');

    const fast = fixture();
    expect(
      JSON.parse(
        validatedRunnerSegmentAssignment(
          JSON.stringify({ ...base, personId: 'P1', maximumSpeed: 0 }),
          fast.env
        )
      ).reason
    ).toBe('excessive-speed');

    const zeroDistance = fixture();
    expect(
      JSON.parse(
        validatedRunnerSegmentAssignment(
          JSON.stringify({
            ...base,
            personId: 'P1',
            points: points.map(point => ({
              ...point,
              timestamp: points[0].timestamp,
            })),
            candidateSegment: { ...candidateSegment, endPointId: 'A' },
          }),
          zeroDistance.env
        )
      )
    ).toMatchObject({ appended: false });

    const nonErrorFailure = fixture(() => {
      throw 'storage-failure';
    });
    expect(
      JSON.parse(
        validatedRunnerSegmentAssignment(
          JSON.stringify({ ...base, personId: 'P1' }),
          nonErrorFailure.env
        )
      ).reason
    ).toBe('storage-failure');
    expect(buildPoints({})).toEqual(new Map());
    expect(normalizeMaximumSpeed(1)).toBe(1);

    const nonZeroInstant = fixture();
    expect(
      JSON.parse(
        validatedRunnerSegmentAssignment(
          JSON.stringify({
            ...base,
            personId: 'P1',
            points: points.map(point => ({
              ...point,
              timestamp: points[0].timestamp,
            })),
          }),
          nonZeroInstant.env
        )
      ).reason
    ).toBe('excessive-speed');
  });

  test('asset writer commits valid IDs and rejects every invalid asset/segment ID', () => {
    const valid = fixture();
    expect(
      JSON.parse(
        validatedAssetSegmentAssignment(
          JSON.stringify({ ...base, assetId: ' A1 ' }),
          valid.env
        )
      )
    ).toMatchObject({ appended: true, feasible: true });
    for (const assetId of [undefined, '', '   ', 'undefined', 'null']) {
      const value = fixture();
      const result = JSON.parse(
        validatedAssetSegmentAssignment(
          JSON.stringify({ ...base, assetId }),
          value.env
        )
      );
      expect(result).toMatchObject({
        appended: false,
        feasible: false,
        reason: 'invalid-asset-id',
      });
      expect(value.state.temporary).toEqual({});
    }
    const missingSegment = fixture();
    const result = JSON.parse(
      validatedAssetSegmentAssignment(
        JSON.stringify({
          ...base,
          assetId: 'A1',
          candidateSegment: { ...candidateSegment, segmentId: '' },
        }),
        missingSegment.env
      )
    );
    expect(result.reason).toBe('invalid-segment-id');
    expect(missingSegment.state.temporary).toEqual({});
  });

  test('runner rejects missing, NaN, infinite, non-numeric, and negative speeds before persistence', () => {
    for (const maximumSpeed of [undefined, '', 'NaN', 'Infinity', 'fast', -1]) {
      const value = fixture();
      const result = JSON.parse(
        validatedRunnerSegmentAssignment(
          JSON.stringify({ ...base, personId: 'P1', maximumSpeed }),
          value.env
        )
      );
      expect(result).toMatchObject({
        appended: false,
        feasible: false,
        reason: 'invalid-maximum-speed',
      });
      expect(value.state.temporary).toEqual({});
    }
  });

  test('runner exact boundary and valid assignment commit; invalid person does not', () => {
    const value = fixture();
    const result = JSON.parse(
      validatedRunnerSegmentAssignment(
        JSON.stringify({ ...base, personId: ' P1 ' }),
        value.env
      )
    );
    expect(result).toMatchObject({ appended: true, feasible: true });
    const invalid = fixture();
    expect(
      JSON.parse(
        validatedRunnerSegmentAssignment(
          JSON.stringify({ ...base, personId: ' ' }),
          invalid.env
        )
      ).reason
    ).toBe('invalid-person-id');
    expect(invalid.state.temporary).toEqual({});
  });

  test('combined writer commits both lists and never partially commits', () => {
    const value = fixture();
    expect(
      JSON.parse(
        validatedAssetCustodianSegmentAssignment(
          JSON.stringify({ ...base, assetId: 'A1', custodianPersonId: 'P1' }),
          value.env
        )
      )
    ).toMatchObject({ committed: true });
    expect(value.state.temporary.assetSegmentAssignments).toHaveLength(1);
    expect(value.state.temporary.personSegmentAssignments).toHaveLength(1);
    const rejected = fixture();
    expect(
      JSON.parse(
        validatedAssetCustodianSegmentAssignment(
          JSON.stringify({
            ...base,
            assetId: 'A1',
            custodianPersonId: undefined,
          }),
          rejected.env
        )
      ).reason
    ).toBe('invalid-custodian-person-id');
    expect(rejected.state.temporary).toEqual({});
    const persistenceFailure = fixture(() => {
      throw new Error('storage-failure');
    });
    const result = JSON.parse(
      validatedAssetCustodianSegmentAssignment(
        JSON.stringify({ ...base, assetId: 'A1', custodianPersonId: 'P1' }),
        persistenceFailure.env
      )
    );
    expect(result.committed).toBe(false);
    expect(persistenceFailure.state.temporary).toEqual({});
  });

  test('combined writer reports each validation boundary', () => {
    const cases = [
      [{ assetId: 'A1' }, 'invalid-custodian-person-id'],
      [{ assetId: 'A1', custodianPersonId: 'P1' }, 'invalid-segment-id'],
      [
        { ...base, assetId: 'A1', custodianPersonId: 'P1', maximumSpeed: 0 },
        'runner:excessive-speed',
      ],
      [
        { ...base, assetId: 'A1', custodianPersonId: 'P1', shifts: [] },
        'runner:outside-shift',
      ],
    ];
    for (const [input, reason] of cases) {
      expect(
        JSON.parse(
          validatedAssetCustodianSegmentAssignment(
            JSON.stringify(input),
            fixture().env
          )
        ).reason
      ).toBe(reason);
    }
    expect(
      JSON.parse(
        validatedAssetCustodianSegmentAssignment(
          JSON.stringify({
            ...base,
            assetId: 'A1',
            custodianPersonId: 'P1',
            stockInPoint: { ...points[0], latitude: 1 },
          }),
          fixture().env
        )
      ).reason
    ).toBe('asset:entry-discontinuity');
    expect(
      JSON.parse(
        validatedAssetSegmentAssignment(
          JSON.stringify({
            ...base,
            assetId: 'A1',
            stockInPoint: { ...points[0], latitude: 1 },
          }),
          fixture().env
        )
      ).reason
    ).toBe('entry-discontinuity');
    const assetFailure = fixture();
    assetFailure.env.set('getData', () => {
      throw 'asset-failure';
    });
    expect(
      JSON.parse(
        validatedAssetSegmentAssignment(
          JSON.stringify({ ...base, assetId: 'A1' }),
          assetFailure.env
        )
      ).reason
    ).toBe('asset-failure');
    const assetErrorFailure = fixture(() => {
      throw new Error('asset-error-failure');
    });
    expect(
      JSON.parse(
        validatedAssetSegmentAssignment(
          JSON.stringify({ ...base, assetId: 'A1' }),
          assetErrorFailure.env
        )
      ).reason
    ).toBe('asset-error-failure');
    expect(
      JSON.parse(
        validatedRunnerSegmentAssignment(
          JSON.stringify({
            ...base,
            personId: 'P1',
            existingSegments: [
              { segmentId: 'EA', startPointId: 'E', endPointId: 'B' },
            ],
          }),
          fixture().env
        )
      ).reason
    ).toBe('temporal-overlap');
    const nonError = fixture(() => {
      throw 'storage-failure';
    });
    expect(
      JSON.parse(
        validatedAssetCustodianSegmentAssignment(
          JSON.stringify({ ...base, assetId: 'A1', custodianPersonId: 'P1' }),
          nonError.env
        )
      ).reason
    ).toBe('storage-failure');
    const runnerFailure = fixture(() => {
      throw 'runner-failure';
    });
    expect(
      JSON.parse(
        validatedAssetCustodianSegmentAssignment(
          JSON.stringify({
            ...base,
            assetId: 'A1',
            custodianPersonId: 'P1',
            existingPersonSegments: [
              { segmentId: 'EA', startPointId: 'E', endPointId: 'B' },
            ],
          }),
          runnerFailure.env
        )
      ).reason
    ).toBe('runner:temporal-overlap');
    expect(
      JSON.parse(
        validatedAssetCustodianSegmentAssignment(
          JSON.stringify({
            ...base,
            assetId: 'A1',
            custodianPersonId: 'P1',
            shifts: undefined,
          }),
          fixture().env
        )
      ).reason
    ).toBe('runner:outside-shift');
  });
});
