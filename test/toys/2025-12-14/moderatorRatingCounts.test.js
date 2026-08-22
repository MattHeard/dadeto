import { describe, expect, it } from '@jest/globals';
import {
  hasRequiredFields,
  hasValidTypes,
  isIso8601String,
  isPlainObject,
  moderatorRatingCounts,
  parseRatings,
} from '../../../src/core/browser/toys/2025-12-14/moderatorRatingCounts.js';

const validRating = {
  isApproved: true,
  moderatorId: 'mod-alpha',
  ratedAt: '2025-11-01T12:00:00Z',
  variantId: 'variant-A',
};

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

    const parseResult = input => JSON.parse(moderatorRatingCounts(input));

    expect(parseResult(JSON.stringify(invalidRatings))).toEqual([]);
    expect(parseResult(JSON.stringify({}))).toEqual([]);
    expect(parseResult('[1, 2, 3]')).toEqual([]);
    expect(parseResult(null)).toEqual([]);
  });

  it('validates each schema boundary directly', () => {
    expect(isPlainObject(validRating)).toBe(true);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject([])).toBe(false);
    expect(hasRequiredFields(validRating)).toBe(true);
    expect(hasRequiredFields({ ...validRating, variantId: undefined })).toBe(
      true
    );
    expect(
      hasRequiredFields({ ...validRating, variantId: undefined, extra: 1 })
    ).toBe(true);
    expect(
      hasRequiredFields(
        Object.fromEntries(
          Object.keys(validRating)
            .filter(key => key !== 'variantId')
            .map(key => [key, validRating[key]])
        )
      )
    ).toBe(false);
    expect(hasValidTypes(validRating)).toBe(true);
    expect(hasValidTypes({ ...validRating, isApproved: 'true' })).toBe(false);
    expect(hasValidTypes({ ...validRating, moderatorId: 1 })).toBe(false);
    expect(hasValidTypes({ ...validRating, ratedAt: 'nope' })).toBe(false);
    expect(hasValidTypes({ ...validRating, variantId: 1 })).toBe(false);
    expect(isIso8601String(validRating.ratedAt)).toBe(true);
    expect(isIso8601String('not-a-date')).toBe(false);
  });

  it('parses only string inputs and falls back to an empty array', () => {
    expect(parseRatings([{ ...validRating }])).toEqual([]);
    expect(parseRatings('not-json')).toEqual([]);
    expect(parseRatings(JSON.stringify([validRating]))).toEqual([validRating]);
  });
});
