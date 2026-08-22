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

  test.each([
    ['null', 'Input must be a JSON object.'],
    ['[]', 'Input must be a JSON object.'],
    [JSON.stringify({ path: 'items' }), 'An assignment object is required.'],
    [JSON.stringify({ path: 'items', assignment: [] }), 'An assignment object is required.'],
    [JSON.stringify({ path: 'items', assignment: { assetId: 'A', segmentId: 'S' } }), ''],
  ])('returns precise validation for %s', (value, error) => {
    const result = JSON.parse(assetSegmentAssignmentList(value, makeEnv().env));
    if (error) expect(result).toEqual({ appended: false, error });
    else expect(result.appended).toBe(true);
  });

  test('rejects a blank path with its specific error', () => {
    expect(JSON.parse(assetSegmentAssignmentList(input({ assetId: 'A', segmentId: 'S' }).replace('assetSegmentAssignments', '   '), makeEnv().env))).toEqual({
      appended: false,
      error: 'A path is required.',
    });
  });
});
