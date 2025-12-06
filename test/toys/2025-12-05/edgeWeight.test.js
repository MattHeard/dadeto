import { describe, expect, it } from '@jest/globals';
import { calculateEdgeWeight } from '../../../src/core/browser/toys/2025-12-05/edgeWeight.js';

describe('calculateEdgeWeight', () => {
  it('returns the fallback when moderators are invalid', () => {
    const result = calculateEdgeWeight({
      moderatorA: '',
      moderatorB: 'alice',
      ratings: {},
    });
    expect(result).toBe(1);
  });

  it('returns the fallback when a moderator entry is missing', () => {
    const ratings = {
      alice: { 'page-P': true },
    };

    const result = calculateEdgeWeight({
      moderatorA: 'alice',
      moderatorB: 'bob',
      ratings,
    });

    expect(result).toBe(1);
  });

  it('returns the fallback when no pages overlap', () => {
    const ratings = {
      alice: { 'page-A': true },
      bob: { 'page-B': true },
    };

    const result = calculateEdgeWeight({
      moderatorA: 'alice',
      moderatorB: 'bob',
      ratings,
    });

    expect(result).toBe(1);
  });

  it('computes disagreement as one minus the agreement ratio', () => {
    const ratings = {
      alice: {
        'page-A': true,
        'page-B': false,
        'page-C': true,
      },
      bob: {
        'page-A': true,
        'page-B': true,
        'page-C': false,
      },
    };

    const result = calculateEdgeWeight({
      moderatorA: 'alice',
      moderatorB: 'bob',
      ratings,
    });

    expect(result).toBeCloseTo(2 / 3, 8);
  });

  it('ignores the specified page when calculating overlap', () => {
    const ratings = {
      alice: {
        'page-A': true,
        'page-B': false,
      },
      bob: {
        'page-A': true,
        'page-B': true,
      },
    };

    const result = calculateEdgeWeight({
      moderatorA: 'alice',
      moderatorB: 'bob',
      ratings,
      ignoredPageId: 'page-A',
    });

    expect(result).toBe(1);
  });
});
