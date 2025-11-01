import { describe, test, expect } from '@jest/globals';
import { neighbours } from '../../../src/core/browser/toys/2025-05-08/battleshipSolitaireFleet.js';

describe('neighbours output', () => {
  test.each([
    [
      { x: 1, y: 2 },
      [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 0, y: 2 },
        { x: 2, y: 2 },
        { x: 0, y: 3 },
        { x: 1, y: 3 },
        { x: 2, y: 3 },
      ],
    ],
    [
      { x: 5, y: 5 },
      [
        { x: 4, y: 4 },
        { x: 5, y: 4 },
        { x: 6, y: 4 },
        { x: 4, y: 5 },
        { x: 6, y: 5 },
        { x: 4, y: 6 },
        { x: 5, y: 6 },
        { x: 6, y: 6 },
      ],
    ],
  ])('neighbours(%p) returns correct cells', (coord, expected) => {
    const result = neighbours(coord);
    expect(result).toEqual(expected);
  });
});
