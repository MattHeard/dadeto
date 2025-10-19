import { generateFleet } from '../../../src/core/toys/2025-05-08/battleshipSolitaireFleet.js';
import { describe, test, expect } from '@jest/globals';

/**
 * Ensure generated ship segments stay within board bounds.
 * @param {{start: {x: number, y: number}, direction: 'H' | 'V', length: number}} ship - Ship configuration
 * @param {{width: number, height: number}} fleet - Board configuration
 */
function assertSegmentInsideBoard(ship, fleet) {
  for (let i = 0; i < ship.length; i++) {
    const sx = ship.start.x + i * Number(ship.direction === 'H');
    const sy = ship.start.y + i * Number(ship.direction === 'V');
    expect(sx).toBeGreaterThanOrEqual(0);
    expect(sx).toBeLessThan(fleet.width);
    expect(sy).toBeGreaterThanOrEqual(0);
    expect(sy).toBeLessThan(fleet.height);
  }
}

describe('generateFleet segment bounds', () => {
  test('all ship segments remain inside the board', () => {
    const cfg = { width: 3, height: 2, ships: [3] };
    const env = new Map([['getRandomNumber', () => 0]]);
    const fleet = JSON.parse(generateFleet(JSON.stringify(cfg), env));
    expect(Array.isArray(fleet.ships)).toBe(true);
    const ship = fleet.ships[0];
    assertSegmentInsideBoard(ship, fleet);
  });
});
