import { describe, test, expect } from '@jest/globals';
import { isCoordWithinBoard } from '../../../src/toys/2025-05-08/battleshipSolitaireFleet.js';

describe('isCoordWithinBoard mutant', () => {
  test('returns false when coordinate equals board width or height', () => {
    const cfg = { width: 3, height: 2 };
    expect(isCoordWithinBoard({ x: 3, y: 0 }, cfg)).toBe(false);
    expect(isCoordWithinBoard({ x: 0, y: 2 }, cfg)).toBe(false);
  });

  test('returns true for coordinates strictly within bounds', () => {
    const cfg = { width: 3, height: 2 };
    expect(isCoordWithinBoard({ x: 0, y: 0 }, cfg)).toBe(true);
    expect(isCoordWithinBoard({ x: 2, y: 1 }, cfg)).toBe(true);
  });
});
