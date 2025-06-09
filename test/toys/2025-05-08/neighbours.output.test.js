import { describe, test, expect } from '@jest/globals';
import { neighbours } from '../../../src/toys/2025-05-08/battleshipSolitaireFleet.js';

describe('neighbours output', () => {
  test('returns surrounding coordinates in expected order', () => {
    const coord = { x: 1, y: 2 };
    const result = neighbours(coord);
    const expected = [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 0, y: 2 },
      { x: 2, y: 2 },
      { x: 0, y: 3 },
      { x: 1, y: 3 },
      { x: 2, y: 3 },
    ];
    expect(result).toEqual(expected);
  });
});
