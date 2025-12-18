import { describe, expect, it } from '@jest/globals';
import {
  shortestDistanceToAdmin,
  guardStopDistance,
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

describe('dequeue', () => {
  it('throws an error when the queue is unexpectedly empty', () => {
    expect(() => dequeue([])).toThrow('Queue unexpectedly empty');
  });
});
