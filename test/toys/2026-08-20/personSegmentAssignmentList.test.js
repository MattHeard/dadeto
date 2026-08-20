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
});
