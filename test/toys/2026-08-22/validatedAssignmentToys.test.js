import { describe, expect, test } from '@jest/globals';
import { validatedAssetSegmentAssignment } from '../../../src/core/browser/toys/2026-08-22/validatedAssetSegmentAssignment.js';
import { validatedRunnerSegmentAssignment } from '../../../src/core/browser/toys/2026-08-22/validatedRunnerSegmentAssignment.js';
import { validatedAssetCustodianSegmentAssignment } from '../../../src/core/browser/toys/2026-08-22/validatedAssetCustodianSegmentAssignment.js';

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
});
