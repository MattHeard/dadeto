import { describe, test, expect } from '@jest/globals';
import { neighbours } from '../../../src/core/browser/toys/2025-05-08/battleshipSolitaireFleet.js';

describe('neighbours mutants', () => {
  test('does not include origin coordinate', () => {
    const result = neighbours({ x: 1, y: 2 });
    const hasOrigin = result.some(c => c.x === 1 && c.y === 2);
    expect(hasOrigin).toBe(false);
    expect(result).toHaveLength(8);
  });

  test('returns eight unique neighbours for various coords', () => {
    const coords = [
      { x: 0, y: 0 },
      { x: 2, y: 3 },
      { x: -1, y: -1 },
    ];
    for (const coord of coords) {
      const result = neighbours(coord);
      const unique = new Set(result.map(c => `${c.x},${c.y}`));
      expect(unique.size).toBe(8);
      expect(unique.has(`${coord.x},${coord.y}`)).toBe(false);
    }
  });
});
