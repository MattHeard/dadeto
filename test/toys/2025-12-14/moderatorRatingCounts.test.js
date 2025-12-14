import { describe, expect, it } from '@jest/globals';
import { moderatorRatingCounts } from '../../../src/core/browser/toys/2025-12-14/moderatorRatingCounts.js';

describe('moderatorRatingCounts', () => {
  it('counts valid ratings per moderator in the order they appear', () => {
    const payload = JSON.stringify([
      {
        isApproved: true,
        moderatorId: 'mod-alpha',
        ratedAt: '2025-11-01T12:00:00Z',
        variantId: 'variant-A',
      },
      {
        isApproved: false,
        moderatorId: 'mod-beta',
        ratedAt: '2025-11-02T08:30:00Z',
        variantId: 'variant-B',
      },
      {
        isApproved: true,
        moderatorId: 'mod-alpha',
        ratedAt: '2025-11-03T18:45:00Z',
        variantId: 'variant-C',
      },
    ]);

    expect(JSON.parse(moderatorRatingCounts(payload))).toEqual([
      { moderatorId: 'mod-alpha', count: 2 },
      { moderatorId: 'mod-beta', count: 1 },
    ]);
  });

  it('ignores malformed ratings and treats any non-array input as empty', () => {
    const invalidRatings = [
      {
        isApproved: 'yes',
        moderatorId: 'mod-alpha',
        ratedAt: '2025-11-01T12:00:00Z',
        variantId: 'variant-A',
      },
      {
        isApproved: true,
        moderatorId: 'mod-beta',
        ratedAt: 'not-a-date',
        variantId: 'variant-B',
      },
      {
        isApproved: false,
        moderatorId: 'mod-alpha',
        ratedAt: 0,
        variantId: 'variant-C',
      },
    ];

    expect(moderatorRatingCounts(JSON.stringify(invalidRatings))).toBe('[]');
    expect(moderatorRatingCounts(JSON.stringify({}))).toBe('[]');
    expect(moderatorRatingCounts('[1, 2, 3]')).toBe('[]');
    expect(moderatorRatingCounts(null)).toBe('[]');
  });
});
