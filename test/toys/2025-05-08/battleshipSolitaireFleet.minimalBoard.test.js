import { describe, test, expect } from '@jest/globals';
import { generateFleet } from '../../../src/core/browser/toys/2025-05-08/battleshipSolitaireFleet.js';

/**
 * Ensure generateFleet can place a single ship on a small board.
 * This covers the candidate accumulation logic in getValidCandidate.
 */
describe('generateFleet minimal board', () => {
  test('places a single length-1 ship on a 2x2 board', () => {
    const cfg = { width: 2, height: 2, ships: [1] };
    const env = new Map([['getRandomNumber', () => 0]]);

    const fleet = JSON.parse(generateFleet(JSON.stringify(cfg), env));

    expect(fleet.width).toBe(2);
    expect(fleet.height).toBe(2);
    expect(Array.isArray(fleet.ships)).toBe(true);
    expect(fleet.ships).toHaveLength(1);
    const ship = fleet.ships[0];
    expect(ship.length).toBe(1);
    expect(ship.start).toEqual({ x: 0, y: 0 });
    expect(['H', 'V']).toContain(ship.direction);
  });
});
