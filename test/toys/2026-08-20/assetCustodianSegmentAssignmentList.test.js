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
});
