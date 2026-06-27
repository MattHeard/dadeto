import { jest } from '@jest/globals';
import {
  buildModeratorGraph,
  calculateModeratorReputations,
  calculateReputation,
  fetchModerationRatings,
  shortestPathDistances,
  writeModeratorReputations,
} from '../../../../src/core/cloud/recalculate-moderator-reputation/recalculate-moderator-reputation-core.js';

describe('recalculate-moderator-reputation core', () => {
  it('seeds a graph from the current moderation ratings', () => {
    const graph = buildModeratorGraph([
      { moderatorId: 'admin', variantId: 'page-1', isApproved: true },
      { moderatorId: 'mod-a', variantId: 'page-1', isApproved: false },
      { moderatorId: 'mod-b', variantId: 'page-1', isApproved: true },
      { moderatorId: 'mod-a', variantId: 'page-2', isApproved: true },
      { moderatorId: 'mod-b', variantId: 'page-2', isApproved: false },
      { moderatorId: 'mod-a', variantId: 'page-3', isApproved: true },
      { moderatorId: 'mod-b', variantId: 'page-3', isApproved: true },
    ]);

    expect(graph.get('admin')?.get('mod-a')).toBe(1);
    expect(graph.get('mod-a')?.get('admin')).toBe(1);
    expect(graph.get('mod-a')?.get('mod-b')).toBe(0);
  });

  it('keeps the lowest edge weight when a later shared page is less aligned', () => {
    const graph = buildModeratorGraph([
      { moderatorId: 'admin', variantId: 'page-1', isApproved: true },
      { moderatorId: 'mod-a', variantId: 'page-1', isApproved: true },
      { moderatorId: 'admin', variantId: 'page-2', isApproved: true },
      { moderatorId: 'mod-a', variantId: 'page-2', isApproved: false },
    ]);

    expect(graph.get('admin')?.get('mod-a')).toBe(0);
  });

  it('computes shortest paths and inverse reputations from the admin moderator', () => {
    const graph = buildModeratorGraph([
      { moderatorId: 'admin', variantId: 'page-1', isApproved: true },
      { moderatorId: 'mod-a', variantId: 'page-1', isApproved: false },
      { moderatorId: 'mod-a', variantId: 'page-2', isApproved: true },
      { moderatorId: 'mod-b', variantId: 'page-2', isApproved: true },
      { moderatorId: 'mod-b', variantId: 'page-3', isApproved: false },
    ]);

    const distances = shortestPathDistances(graph, 'admin');
    const reputations = calculateModeratorReputations(
      [
        { moderatorId: 'admin', variantId: 'page-1', isApproved: true },
        { moderatorId: 'mod-a', variantId: 'page-1', isApproved: false },
        { moderatorId: 'mod-a', variantId: 'page-2', isApproved: true },
        { moderatorId: 'mod-b', variantId: 'page-2', isApproved: true },
        { moderatorId: 'mod-b', variantId: 'page-3', isApproved: false },
      ],
      'admin'
    );

    expect(distances.get('admin')).toBe(0);
    expect(distances.get('mod-a')).toBe(1);
    expect(distances.get('mod-b')).toBe(1);
    expect(calculateReputation(0)).toBe(1);
    expect(calculateReputation(1)).toBe(0.5);
    expect(reputations[0]).toMatchObject({
      moderatorId: 'admin',
      reputation: 1,
    });
  });

  it('returns zero reputation for moderators that are unreachable from the admin moderator', () => {
    expect(calculateReputation(Infinity)).toBe(0);
    expect(
      calculateModeratorReputations(
        [{ moderatorId: 'mod-a', variantId: 'page-1', isApproved: false }],
        'admin'
      )
    ).toEqual([
      {
        moderatorId: 'mod-a',
        reputation: 0,
      },
    ]);
  });

  it('skips already-visited moderators when the graph contains a cycle', () => {
    const graph = new Map([
      [
        'admin',
        new Map([
          ['mod-a', 5],
          ['mod-b', 1],
        ]),
      ],
      ['mod-a', new Map([['admin', 5]])],
      ['mod-b', new Map([['mod-a', 1]])],
    ]);

    const distances = shortestPathDistances(graph, 'admin');
    expect(distances.get('admin')).toBe(0);
    expect(distances.get('mod-a')).toBe(2);
    expect(distances.get('mod-b')).toBe(1);
  });

  it('reads moderation ratings from Firestore-like snapshots and writes cached reputations', async () => {
    const set = jest.fn();
    const db = {
      collection: jest.fn(name => {
        if (name === 'moderationRatings') {
          return {
            get: jest.fn().mockResolvedValue({
              docs: [
                {
                  data: () => ({
                    moderatorId: 'admin',
                    variantId: 'page-1',
                    isApproved: true,
                  }),
                },
                {
                  data: () => ({
                    moderatorId: '',
                    variantId: 'page-2',
                    isApproved: true,
                  }),
                },
                {
                  data: () => null,
                },
                {
                  data: () => ({
                    moderatorId: 'mod-b',
                    variantId: '',
                    isApproved: true,
                  }),
                },
                {
                  data: () => ({
                    moderatorId: 'mod-c',
                    variantId: 'page-3',
                    isApproved: 'yes',
                  }),
                },
                {
                  data: () => ({
                    moderatorId: 'mod-a',
                    variantId: 'page-1',
                    isApproved: false,
                  }),
                },
              ],
            }),
          };
        }

        return {
          doc: jest.fn(() => ({ set })),
        };
      }),
    };

    const ratings = await fetchModerationRatings(db);
    expect(ratings).toHaveLength(2);

    const reputations = calculateModeratorReputations(ratings, 'admin');
    await writeModeratorReputations(db, reputations, {
      updatedAt: '2026-06-26T00:00:00.000Z',
    });

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        moderatorReputation: expect.any(Number),
        moderatorReputationUpdatedAt: '2026-06-26T00:00:00.000Z',
      })
    );
  });
});
