import { generateFleet } from '../../../src/toys/2025-05-08/battleshipSolitaireFleet.js';
import { describe, test, expect } from '@jest/globals';

/**
 * Ensure generated ship segments stay within board bounds.
 */
describe('generateFleet segment bounds', () => {
  test('all ship segments remain inside the board', () => {
    const cfg = { width: 3, height: 2, ships: [3] };
    const env = new Map([['getRandomNumber', () => 0]]);
    const fleet = JSON.parse(generateFleet(JSON.stringify(cfg), env));
    expect(Array.isArray(fleet.ships)).toBe(true);
    const ship = fleet.ships[0];
    for (let i = 0; i < ship.length; i++) {
      const sx = ship.start.x + (ship.direction === 'H' ? i : 0);
      const sy = ship.start.y + (ship.direction === 'V' ? i : 0);
      expect(sx).toBeGreaterThanOrEqual(0);
      expect(sx).toBeLessThan(fleet.width);
      expect(sy).toBeGreaterThanOrEqual(0);
      expect(sy).toBeLessThan(fleet.height);
    }
  });
});
