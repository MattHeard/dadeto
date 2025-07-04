import { describe, test, expect } from '@jest/globals';
import { isCoordNonNegative } from '../../../src/toys/2025-05-08/battleshipSolitaireFleet.js';

describe('isCoordNonNegative mutant', () => {
  test('returns false when either coordinate is negative', () => {
    expect(isCoordNonNegative({ x: -1, y: 0 })).toBe(false);
    expect(isCoordNonNegative({ x: 0, y: -1 })).toBe(false);
  });

  test('returns true when both coordinates are non-negative', () => {
    expect(isCoordNonNegative({ x: 0, y: 0 })).toBe(true);
    expect(isCoordNonNegative({ x: 2, y: 3 })).toBe(true);
  });
});
