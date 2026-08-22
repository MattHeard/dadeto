import { describe, expect, test } from '@jest/globals';
import { personSegmentAssignmentList } from '../../../src/core/browser/toys/2026-08-20/personSegmentAssignmentList.js';

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

describe('personSegmentAssignmentList', () => {
  test('appends exact person and segment references', () => {
    const value = fixture();
    const result = JSON.parse(
      personSegmentAssignmentList(
        JSON.stringify({
          path: 'assignments',
          assignment: { personId: ' P1 ', segmentId: 'S1', extra: true },
        }),
        value.env
      )
    );
    expect(result).toMatchObject({ appended: true, length: 1 });
    expect(value.state.temporary.assignments).toEqual([
      { personId: 'P1', segmentId: 'S1' },
    ]);
  });

  test('rejects incomplete assignments', () => {
    expect(
      JSON.parse(
        personSegmentAssignmentList(
          JSON.stringify({
            path: 'assignments',
            assignment: { personId: 'P1' },
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
        personSegmentAssignmentList(
          JSON.stringify({
            memoryLocation,
            path: 'nested.assignments',
            assignment: { personId: 'P1', segmentId: 'S1' },
          }),
          value.env
        )
      );
      expect(result.appended).toBe(true);
    }
  );

  test('rejects unsupported memory locations and non-list paths', () => {
    const value = fixture();
    expect(
      JSON.parse(
        personSegmentAssignmentList(
          JSON.stringify({
            memoryLocation: 'unknown',
            path: 'assignments',
            assignment: { personId: 'P1', segmentId: 'S1' },
          }),
          value.env
        )
      ).appended
    ).toBe(false);
    value.state.temporary.assignments = {};
    expect(
      JSON.parse(
        personSegmentAssignmentList(
          JSON.stringify({
            path: 'assignments',
            assignment: { personId: 'P1', segmentId: 'S1' },
          }),
          value.env
        )
      ).appended
    ).toBe(false);
  });

  test('rejects malformed JSON and array assignments', () => {
    expect(
      JSON.parse(personSegmentAssignmentList('{', fixture().env)).appended
    ).toBe(false);
    expect(
      JSON.parse(
        personSegmentAssignmentList(
          JSON.stringify({ path: 'assignments', assignment: [] }),
          fixture().env
        )
      ).appended
    ).toBe(false);
    expect(
      JSON.parse(personSegmentAssignmentList('null', fixture().env)).appended
    ).toBe(false);
    expect(
      JSON.parse(personSegmentAssignmentList('', fixture().env)).appended
    ).toBe(false);
    for (const assignment of [
      null,
      [],
      {},
      { personId: '', segmentId: 'S' },
      { personId: 'P', segmentId: '' },
    ]) {
      expect(
        JSON.parse(
          personSegmentAssignmentList(
            JSON.stringify({ path: 'assignments', assignment }),
            fixture().env
          )
        ).appended
      ).toBe(false);
    }
  });

  test.each([
    ['0', 'Input must be a JSON object.'],
    [JSON.stringify({ path: 'items' }), 'An assignment object is required.'],
    [JSON.stringify({ path: 'items', assignment: null }), 'An assignment object is required.'],
    [JSON.stringify({ path: 'items', assignment: [] }), 'An assignment object is required.'],
    [JSON.stringify({ path: 'items', assignment: { personId: '', segmentId: 'S' } }), 'An assignment requires personId and segmentId.'],
    [JSON.stringify({ path: 'items', assignment: { personId: 'P', segmentId: '' } }), 'An assignment requires personId and segmentId.'],
  ])('returns precise validation errors for %s', (input, error) => {
    expect(JSON.parse(personSegmentAssignmentList(input, fixture().env))).toEqual({ appended: false, error });
  });

  test('returns precise path and location errors and coerces numeric paths', () => {
    expect(JSON.parse(personSegmentAssignmentList(JSON.stringify({
      path: ' ', assignment: { personId: 'P', segmentId: 'S' },
    }), fixture().env))).toEqual({ appended: false, error: 'A path is required.' });
    expect(JSON.parse(personSegmentAssignmentList(JSON.stringify({
      memoryLocation: 'other', path: 'items', assignment: { personId: 'P', segmentId: 'S' },
    }), fixture().env))).toEqual({ appended: false, error: 'Unsupported memory location.' });
    const value = fixture();
    expect(JSON.parse(personSegmentAssignmentList(JSON.stringify({
      path: 42, assignment: { personId: 'P', segmentId: 'S' },
    }), value.env))).toMatchObject({ appended: true, length: 1 });
    expect(value.state.temporary['42']).toEqual([{ personId: 'P', segmentId: 'S' }]);
  });
});
