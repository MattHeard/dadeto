import { describe, expect, test } from '@jest/globals';
import { assetSegmentAssignmentList } from '../../../src/core/browser/toys/2026-08-20/assetSegmentAssignmentList.js';

const makeEnv = () => {
  let permanent = {};
  const state = { temporary: {} };
  return {
    state,
    get permanent() {
      return permanent;
    },
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

const input = assignment =>
  JSON.stringify({ path: 'assetSegmentAssignments', assignment });

describe('assetSegmentAssignmentList', () => {
  test('appends exact asset and segment references without replacing entries', () => {
    const fixture = makeEnv();
    const first = JSON.parse(
      assetSegmentAssignmentList(
        input({ assetId: ' A1 ', segmentId: 'S1', extra: 'ignored' }),
        fixture.env
      )
    );
    const second = JSON.parse(
      assetSegmentAssignmentList(
        input({ assetId: 'A2', segmentId: 'S2' }),
        fixture.env
      )
    );
    expect(first).toMatchObject({ appended: true, length: 1 });
    expect(second).toMatchObject({ appended: true, length: 2 });
    expect(fixture.state.temporary.assetSegmentAssignments).toEqual([
      { assetId: 'A1', segmentId: 'S1' },
      { assetId: 'A2', segmentId: 'S2' },
    ]);
  });

  test('allows duplicate references as separate append operations', () => {
    const fixture = makeEnv();
    const payload = input({ assetId: 'A1', segmentId: 'S1' });
    assetSegmentAssignmentList(payload, fixture.env);
    const result = JSON.parse(assetSegmentAssignmentList(payload, fixture.env));
    expect(result).toMatchObject({ appended: true, length: 2 });
  });

  test.each([
    { assetId: '', segmentId: 'S1' },
    { assetId: 'A1', segmentId: ' ' },
    { assetId: 'A1' },
  ])('rejects incomplete assignment %#', assignment => {
    const result = JSON.parse(
      assetSegmentAssignmentList(input(assignment), makeEnv().env)
    );
    expect(result).toMatchObject({ appended: false });
  });
});
