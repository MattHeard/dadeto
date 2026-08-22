import { describe, expect, it } from '@jest/globals';
import {
  shortestDistanceToAdmin,
  buildNodeList,
  createInitialState,
  createNeighborEntry,
  enqueueIfImproved,
  guardAdmin,
  guardBeyondLimit,
  guardStopDistance,
  guardVisited,
  hasShorterPath,
  dequeue,
} from '../../../src/core/browser/toys/2025-12-05/dijkstra.js';

describe('shortestDistanceToAdmin', () => {
  it('returns the fallback when identifiers are invalid', () => {
    const result = shortestDistanceToAdmin({
      moderatorId: '',
      adminId: 'admin',
      ratings: {},
    });
    expect(result).toBe(1);
  });

  it('short-circuits when the moderator is the admin', () => {
    const result = shortestDistanceToAdmin({
      moderatorId: 'admin',
      adminId: 'admin',
      ratings: {
        admin: { 'page-P': true },
      },
    });
    expect(result).toBe(0);
  });

  it('finds a chain of agreement when a path exists', () => {
    const ratings = {
      matt: { 'page-A': true },
      alice: { 'page-A': true, 'page-B': true },
      bob: { 'page-B': true, 'page-C': true },
      admin: { 'page-C': true },
    };

    const result = shortestDistanceToAdmin({
      moderatorId: 'matt',
      adminId: 'admin',
      ratings,
      ignoredPageId: 'page-P',
    });

    expect(result).toBe(0);
  });

  it('skips revisiting moderators when duplicates are enqueued', () => {
    const ratings = {
      matt: { 'page-A': true, 'page-B': false },
      alice: { 'page-A': true, 'page-B': false, 'page-C': true },
      bob: { 'page-A': true, 'page-B': true, 'page-C': true },
      admin: { 'page-Z': true },
    };

    const result = shortestDistanceToAdmin({
      moderatorId: 'matt',
      adminId: 'admin',
      ratings,
      ignoredPageId: 'page-P',
    });

    expect(result).toBe(1);
  });

  it('halts when the remaining distances cannot beat the best known score', () => {
    const ratings = {
      matt: { 'page-X': true },
      loner: { 'page-Y': true },
      admin: { 'page-Z': true },
    };

    const result = shortestDistanceToAdmin({
      moderatorId: 'matt',
      adminId: 'admin',
      ratings,
      ignoredPageId: 'page-P',
    });

    expect(result).toBe(1);
  });

  it('handles non-object ratings lists', () => {
    const result = shortestDistanceToAdmin({
      moderatorId: 'matt',
      adminId: 'admin',
      ratings: 'not-an-object',
      ignoredPageId: 'page-P',
    });

    expect(result).toBe(1);
  });
});

describe('guardStopDistance', () => {
  it('clears the queue when the distance does not improve on the best known path', () => {
    const state = { bestDistance: 0.4, queue: [{}, {}] };
    const result = guardStopDistance(state, 0.5);
    expect(result).toBe(true);
    expect(state.queue).toHaveLength(0);
  });
});

describe('dijkstra helper contracts', () => {
  it('marks a new node and skips a previously visited node', () => {
    const visited = new Set();
    expect(guardVisited(visited, 'alice')).toBe(false);
    expect(guardVisited(visited, 'alice')).toBe(true);
    expect(visited).toEqual(new Set(['alice']));
  });

  it('updates and clears the state when the admin is reached', () => {
    const state = { bestDistance: 1, queue: [{ id: 'later', distance: 0.2 }] };
    const current = { id: 'admin', distance: 0.4 };
    expect(guardAdmin(state, 'admin', current)).toBe(true);
    expect(state.bestDistance).toBe(0.4);
    expect(state.queue).toEqual([]);
    expect(guardAdmin(state, 'other', current)).toBe(false);
  });

  it('stops paths at the maximum distance', () => {
    expect(guardBeyondLimit(1)).toBe(true);
    expect(guardBeyondLimit(0.99)).toBe(false);
  });

  it('initializes the priority-search state', () => {
    expect(createInitialState('matt')).toEqual({
      visited: new Set(),
      queue: [{ id: 'matt', distance: 0 }],
      distances: new Map([['matt', 0]]),
      bestDistance: 1,
    });
  });

  it('builds a unique node list and always includes both endpoints', () => {
    expect(buildNodeList({ alice: {}, bob: {} }, 'alice', 'admin')).toEqual([
      'alice',
      'bob',
      'admin',
    ]);
    expect(buildNodeList(null, 'alice', 'admin')).toEqual(['alice', 'admin']);
  });

  it('tracks only strictly improved known paths', () => {
    const distances = new Map([['alice', 0.4]]);
    expect(hasShorterPath(distances, 'alice', 0.4)).toBe(true);
    expect(hasShorterPath(distances, 'alice', 0.5)).toBe(true);
    expect(hasShorterPath(distances, 'alice', 0.3)).toBe(false);
    expect(hasShorterPath(distances, 'bob', 0.3)).toBe(false);
    const queue = [];
    enqueueIfImproved({ id: 'bob', distance: 0.3 }, queue, distances);
    expect(queue).toEqual([{ id: 'bob', distance: 0.3 }]);
    expect(distances.get('bob')).toBe(0.3);
  });

  it('rejects unusable neighbor edges and accepts improving edges', () => {
    const ratings = {
      matt: { 'page-A': true },
      alice: { 'page-A': true, 'page-P': true },
      admin: { 'page-A': true },
    };
    expect(
      createNeighborEntry({
        current: { id: 'matt', distance: 0 },
        neighbor: 'alice',
        ratings,
        bestDistance: 1,
      })
    ).toEqual({ id: 'alice', distance: 0 });
    expect(
      createNeighborEntry({
        current: { id: 'matt', distance: 0 },
        neighbor: 'missing',
        ratings,
        bestDistance: 1,
      })
    ).toBeNull();
  });
});

describe('dequeue', () => {
  it('throws an error when the queue is unexpectedly empty', () => {
    expect(() => dequeue([])).toThrow('Queue unexpectedly empty');
  });
});
