import { describe, test, expect } from '@jest/globals';
import { neighbours } from '../../../src/toys/2025-05-08/battleshipSolitaireFleet.js';

describe('neighbours mutants', () => {
  test('does not include origin coordinate', () => {
    const result = neighbours({ x: 1, y: 2 });
    const hasOrigin = result.some(c => c.x === 1 && c.y === 2);
    expect(hasOrigin).toBe(false);
    expect(result).toHaveLength(8);
  });
});
