import { describe, expect, test } from '@jest/globals';
import { assetCustodianSegmentAssignmentList } from '../../../src/core/browser/toys/2026-08-20/assetCustodianSegmentAssignmentList.js';

const fixture = () => {
  const state = { temporary: {} };
  let permanent = {};
  return {
    state,
    env: new Map([
      ['getData', () => state],
      ['setLocalTemporaryData', next => Object.assign(state, next)],
      ['getLocalPermanentData', () => permanent],
      [
        'setLocalPermanentData',
        next => {
          permanent = next;
        },
      ],
    ]),
  };
};

describe('assetCustodianSegmentAssignmentList', () => {
  test('appends an exact asset, segment, and custodian reference', () => {
    const value = fixture();
    const result = JSON.parse(
      assetCustodianSegmentAssignmentList(
        JSON.stringify({
          path: 'assignments',
          assignment: {
            assetId: ' A1 ',
            segmentId: 'S1',
            custodianPersonId: ' C1 ',
            extra: true,
          },
        }),
        value.env
      )
    );
    expect(result).toMatchObject({ appended: true, length: 1 });
    expect(value.state.temporary.assignments).toEqual([
      { assetId: 'A1', segmentId: 'S1', custodianPersonId: 'C1' },
    ]);
  });

  test('rejects an assignment without a custodian', () => {
    expect(
      JSON.parse(
        assetCustodianSegmentAssignmentList(
          JSON.stringify({
            path: 'assignments',
            assignment: { assetId: 'A1', segmentId: 'S1' },
          }),
          fixture().env
        )
      )
    ).toMatchObject({ appended: false });
  });

  test.each(['permanent', 'envelope'])(
    'writes to %s memory',
    memoryLocation => {
      const value = fixture();
      const result = JSON.parse(
        assetCustodianSegmentAssignmentList(
          JSON.stringify({
            memoryLocation,
            path: 'nested.assignments',
            assignment: {
              assetId: 'A1',
              segmentId: 'S1',
              custodianPersonId: 'C1',
            },
          }),
          value.env
        )
      );
      expect(result.appended).toBe(true);
    }
  );

  test('rejects invalid paths and memory locations', () => {
    expect(
      JSON.parse(
        assetCustodianSegmentAssignmentList(
          JSON.stringify({
            path: 'assignments',
            memoryLocation: 'unknown',
            assignment: {
              assetId: 'A',
              segmentId: 'S',
              custodianPersonId: 'C',
            },
          }),
          fixture().env
        )
      ).appended
    ).toBe(false);
    expect(
      JSON.parse(
        assetCustodianSegmentAssignmentList(
          JSON.stringify({
            path: 'assignments',
            assignment: {
              assetId: 'A',
              segmentId: 'S',
              custodianPersonId: 'C',
            },
          }),
          new Map()
        )
      ).appended
    ).toBe(false);
  });

  test('rejects malformed JSON, arrays, and non-list paths', () => {
    expect(
      JSON.parse(assetCustodianSegmentAssignmentList('{', fixture().env))
        .appended
    ).toBe(false);
    expect(
      JSON.parse(
        assetCustodianSegmentAssignmentList(
          JSON.stringify({ path: 'assignments', assignment: [] }),
          fixture().env
        )
      ).appended
    ).toBe(false);
    const value = fixture();
    value.state.temporary.assignments = {};
    expect(
      JSON.parse(
        assetCustodianSegmentAssignmentList(
          JSON.stringify({
            path: 'assignments',
            assignment: {
              assetId: 'A',
              segmentId: 'S',
              custodianPersonId: 'C',
            },
          }),
          value.env
        )
      ).appended
    ).toBe(false);
    expect(
      JSON.parse(assetCustodianSegmentAssignmentList('null', fixture().env))
        .appended
    ).toBe(false);
    for (const assignment of [
      null,
      [],
      {},
      { assetId: '', segmentId: 'S', custodianPersonId: 'C' },
      { assetId: 'A', segmentId: '', custodianPersonId: 'C' },
      { assetId: 'A', segmentId: 'S', custodianPersonId: '' },
    ]) {
      expect(
        JSON.parse(
          assetCustodianSegmentAssignmentList(
            JSON.stringify({ path: 'assignments', assignment }),
            fixture().env
          )
        ).appended
      ).toBe(false);
    }
    expect(
      JSON.parse(assetCustodianSegmentAssignmentList('', fixture().env))
        .appended
    ).toBe(false);
    const nullEnv = new Map([
      ['getData', () => null],
      ['setLocalTemporaryData', () => {}],
      ['getLocalPermanentData', () => null],
      ['setLocalPermanentData', () => {}],
    ]);
    expect(
      JSON.parse(
        assetCustodianSegmentAssignmentList(
          JSON.stringify({
            path: 'items',
            assignment: {
              assetId: 'A',
              segmentId: 'S',
              custodianPersonId: 'C',
            },
          }),
          nullEnv
        )
      ).appended
    ).toBe(true);
  });

  test.each([
    ['null', 'Input must be a JSON object.'],
    ['[]', 'Input must be a JSON object.'],
    ['0', 'Input must be a JSON object.'],
    [JSON.stringify({ path: 'items' }), 'An assignment object is required.'],
    [JSON.stringify({ path: 'items', assignment: null }), 'An assignment object is required.'],
    [JSON.stringify({ path: 'items', assignment: [] }), 'An assignment object is required.'],
    [JSON.stringify({ path: 'items', assignment: { assetId: 'A', segmentId: 'S', custodianPersonId: 'C' } }), ''],
  ])('returns the precise validation result for %s', (input, error) => {
    const result = JSON.parse(assetCustodianSegmentAssignmentList(input, fixture().env));
    if (error) expect(result).toEqual({ appended: false, error });
    else expect(result.appended).toBe(true);
  });

  test('defaults memory location and trims path and identifiers', () => {
    const value = fixture();
    const result = JSON.parse(assetCustodianSegmentAssignmentList(JSON.stringify({
      path: ' items ',
      assignment: { assetId: ' A ', segmentId: ' S ', custodianPersonId: ' C ' },
    }), value.env));
    expect(result).toMatchObject({ appended: true, length: 1 });
    expect(value.state.temporary.items).toEqual([{ assetId: 'A', segmentId: 'S', custodianPersonId: 'C' }]);
  });

  test('stringifies a numeric path before appending', () => {
    const value = fixture();
    const result = JSON.parse(assetCustodianSegmentAssignmentList(JSON.stringify({
      path: 42,
      assignment: { assetId: 'A', segmentId: 'S', custodianPersonId: 'C' },
    }), value.env));
    expect(result).toMatchObject({ appended: true, length: 1 });
    expect(value.state.temporary['42']).toEqual([{ assetId: 'A', segmentId: 'S', custodianPersonId: 'C' }]);
  });

  test('preserves precise errors for empty identifiers, path, and location', () => {
    const cases = [
      [{ path: 'items', assignment: { assetId: '', segmentId: 'S', custodianPersonId: 'C' } }, 'An assignment requires assetId, segmentId, and custodianPersonId.'],
      [{ path: 'items', assignment: { assetId: 'A', segmentId: '', custodianPersonId: 'C' } }, 'An assignment requires assetId, segmentId, and custodianPersonId.'],
      [{ path: 'items', assignment: { assetId: 'A', segmentId: 'S', custodianPersonId: '' } }, 'An assignment requires assetId, segmentId, and custodianPersonId.'],
      [{ path: '   ', assignment: { assetId: 'A', segmentId: 'S', custodianPersonId: 'C' } }, 'A path is required.'],
      [{ path: 'items', memoryLocation: 'other', assignment: { assetId: 'A', segmentId: 'S', custodianPersonId: 'C' } }, 'Unsupported memory location.'],
    ];
    for (const [input, error] of cases) {
      expect(JSON.parse(assetCustodianSegmentAssignmentList(JSON.stringify(input), fixture().env))).toEqual({ appended: false, error });
    }
  });
});
