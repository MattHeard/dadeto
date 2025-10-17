import { describe, expect, it, jest } from '@jest/globals';
import {
  buildVariantQueryPlan,
  createVariantSnapshotFetcher,
} from '../../src/cloud/assign-moderation-job/core.js';

describe('buildVariantQueryPlan', () => {
  it('returns descriptors in the expected order', () => {
    const plan = buildVariantQueryPlan(0.5);
    expect(plan).toEqual([
      { reputation: 'zeroRated', comparator: '>=', randomValue: 0.5 },
      { reputation: 'zeroRated', comparator: '<', randomValue: 0.5 },
      { reputation: 'any', comparator: '>=', randomValue: 0.5 },
      { reputation: 'any', comparator: '<', randomValue: 0.5 },
    ]);
  });
});

describe('createVariantSnapshotFetcher', () => {
  it('executes the query plan until a snapshot contains results', async () => {
    const snapshots = [
      { empty: true, id: 'zeroRatedForward' },
      { empty: true, id: 'zeroRatedWrap' },
      { empty: false, id: 'fallbackForward' },
      { empty: false, id: 'fallbackWrap' },
    ];
    const runQuery = jest.fn().mockImplementation(() => snapshots.shift());
    const fetchVariantSnapshot = createVariantSnapshotFetcher({ runQuery });

    const result = await fetchVariantSnapshot(0.73);

    const [firstCall, secondCall, thirdCall] = runQuery.mock.calls;
    const plan = buildVariantQueryPlan(0.73);

    expect(runQuery).toHaveBeenCalledTimes(3);
    expect(firstCall).toEqual([plan[0]]);
    expect(secondCall).toEqual([plan[1]]);
    expect(thirdCall).toEqual([plan[2]]);
    expect(result).toEqual({ empty: false, id: 'fallbackForward' });
  });

  it('returns the final snapshot when all queries are empty', async () => {
    const snapshots = [
      { empty: true, id: 'first' },
      { empty: true, id: 'second' },
      { empty: true, id: 'third' },
      { empty: true, id: 'fourth' },
    ];
    const runQuery = jest.fn().mockImplementation(() => snapshots.shift());
    const fetchVariantSnapshot = createVariantSnapshotFetcher({ runQuery });

    const result = await fetchVariantSnapshot(0.12);

    expect(runQuery).toHaveBeenCalledTimes(4);
    expect(result).toEqual({ empty: true, id: 'fourth' });
  });
});
