import { describe, test, expect } from '@jest/globals';
import { neighbours } from '../../../src/toys/2025-05-08/battleshipSolitaireFleet.js';

describe('neighbours exact coordinates', () => {
  test('returns the eight surrounding cells in a fixed order', () => {
    const coord = { x: 5, y: 5 };
    const result = neighbours(coord);
    const expected = [
      { x: 4, y: 4 },
      { x: 5, y: 4 },
      { x: 6, y: 4 },
      { x: 4, y: 5 },
      { x: 6, y: 5 },
      { x: 4, y: 6 },
      { x: 5, y: 6 },
      { x: 6, y: 6 },
    ];
    expect(result).toEqual(expected);
  });
});
