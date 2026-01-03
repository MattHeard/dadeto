import { generateFleet } from '../../../src/core/browser/toys/2025-05-08/battleshipSolitaireFleet.js';
import { describe, test, expect } from '@jest/globals';

describe('generateFleet', () => {
  // Minimal env mock
  const env = new Map([
    ['getRandomNumber', () => 0], // Always pick first candidate
  ]);

  test('returns empty fleet for invalid JSON', () => {
    const result = generateFleet('not a json', env);
    expect(JSON.parse(result)).toEqual({ width: 10, height: 10, ships: [] });
  });

  test('returns empty fleet for missing ships', () => {
    const cfg = { width: 4, height: 4 };
    const result = generateFleet(JSON.stringify(cfg), env);
    expect(JSON.parse(result)).toEqual({ width: 4, height: 4, ships: [] });
  });

  test('returns error if ship segments exceed board area', () => {
    const cfg = { width: 2, height: 2, ships: [3, 3] };
    const result = generateFleet(JSON.stringify(cfg), env);
    expect(JSON.parse(result)).toEqual({
      error: 'Ship segments exceed board area',
    });
  });

  test('places a vertical ship of length 3 somewhere', () => {
    /**
     * Get occupied coordinates for a ship.
     * @param {{start: {x: number, y: number}, length: number}} ship - Ship to inspect
     * @returns {Array<[number, number]>} List of occupied cells
     */
    function getOccupiedCells(ship) {
      const occupied = [];
      for (let i = 0; i < ship.length; i++) {
        const sx = ship.start.x;
        const sy = ship.start.y + i;
        occupied.push([sx, sy]);
      }
      return occupied;
    }
    // 3x3 board, place a vertical ship of length 3 somewhere
    const cfg = { width: 3, height: 3, ships: [3] };
    // getRandomNumber: () => 0.5 will select a vertical candidate in the shuffled list
    const env = new Map([['getRandomNumber', () => 0.5]]);
    const result = generateFleet(JSON.stringify(cfg), env);
    const fleet = JSON.parse(result);
    expect(fleet.width).toBe(3);
    expect(fleet.height).toBe(3);
    expect(Array.isArray(fleet.ships)).toBe(true);
    expect(fleet.ships.length).toBe(1);
    const ship = fleet.ships[0];
    expect(ship.length).toBe(3);
    expect(ship.direction).toBe('V');
    // All occupied squares must be in the same column and consecutive rows
    const occupied = getOccupiedCells(ship);
    // Check that all x are the same and y are consecutive
    const xs = occupied.map(([x]) => x);
    const ys = occupied.map(([, y]) => y);
    expect(new Set(xs).size).toBe(1);
    ys.sort((a, b) => a - b);
    expect(ys).toEqual([ys[0], ys[0] + 1, ys[0] + 2]);
    // All cells are within bounds
    for (const [x, y] of occupied) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(3);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThan(3);
    }
  });

  test('places a horizontal ship when only horizontal fit is possible', () => {
    const cfg = { width: 3, height: 2, ships: [3] };
    const env = new Map([['getRandomNumber', () => 0]]);
    const fleet = JSON.parse(generateFleet(JSON.stringify(cfg), env));
    expect(fleet).toEqual({
      width: 3,
      height: 2,
      ships: [
        {
          start: { x: 0, y: 0 },
          length: 3,
          direction: 'H',
        },
      ],
    });
    const ship = fleet.ships[0];
    const occupied = [];
    for (let i = 0; i < ship.length; i++) {
      const sx = ship.start.x + i;
      const sy = ship.start.y;
      occupied.push([sx, sy]);
    }
    expect(occupied).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
    ]);
  });

  test('generates a valid fleet for simple input', () => {
    const cfg = { width: 4, height: 4, ships: [2, 2] };
    const result = generateFleet(JSON.stringify(cfg), env);
    const fleet = JSON.parse(result);
    expect(fleet.width).toBe(4);
    expect(fleet.height).toBe(4);
    expect(Array.isArray(fleet.ships)).toBe(true);
    expect(fleet.ships.length).toBe(2);
    // Check expected structure
    for (const ship of fleet.ships) {
      expect(typeof ship.length).toBe('number');
      expect(['H', 'V']).toContain(ship.direction);
      expect(typeof ship.start.x).toBe('number');
      expect(typeof ship.start.y).toBe('number');
    }
  });

  test('noTouching true blocks all adjacent placements (full adjacency block)', () => {
    // 2x2 board, try to place four 1-length ships with noTouching true
    // All placements are blocked by adjacency, so fleet generation fails
    const cfg = { width: 2, height: 2, ships: [1, 1, 1, 1], noTouching: true };
    const result = generateFleet(JSON.stringify(cfg), env);
    expect(JSON.parse(result)).toEqual({
      error: 'Failed to generate fleet after max retries',
    });
  });

  test('ignores diagonalAllowed property', () => {
    const cfg = { width: 4, height: 4, ships: [2], diagonalAllowed: true };
    const result = generateFleet(JSON.stringify(cfg), env);
    const fleet = JSON.parse(result);
    expect(fleet.width).toBe(4);
    expect(fleet.height).toBe(4);
    expect(Array.isArray(fleet.ships)).toBe(true);
  });

  test('parses comma-separated string ships into array', () => {
    const cfg = { width: 4, height: 4, ships: '2, 3, 1' };
    const result = generateFleet(JSON.stringify(cfg), env);
    const fleet = JSON.parse(result);
    expect(Array.isArray(fleet.ships)).toBe(true);
    const lengths = fleet.ships.map(ship => ship.length).sort((a, b) => a - b);
    expect(lengths).toEqual([1, 2, 3]);
  });

  test('parses multi-digit ship lengths from string', () => {
    const cfg = { width: 11, height: 11, ships: '10, 2' };
    const result = generateFleet(JSON.stringify(cfg), env);
    const fleet = JSON.parse(result);
    const lengths = fleet.ships.map(s => s.length).sort((a, b) => a - b);
    expect(lengths).toEqual([2, 10]);
  });

  test('parses ships string ignoring empty entries', () => {
    const cfg = { width: 4, height: 4, ships: '2,,3' };
    const result = generateFleet(JSON.stringify(cfg), env);
    const fleet = JSON.parse(result);
    const lengths = fleet.ships.map(ship => ship.length).sort((a, b) => a - b);
    expect(lengths).toEqual([2, 3]);
  });

  test('parses string width and height into numbers', () => {
    const cfg = { width: '5', height: '5', ships: [2] };
    const result = generateFleet(JSON.stringify(cfg), env);
    const fleet = JSON.parse(result);
    expect(fleet.width).toBe(5);
    expect(fleet.height).toBe(5);
  });

  test('uses empty config if JSON parse fails', () => {
    const result = generateFleet('{bad json', env);
    const fleet = JSON.parse(result);
    expect(fleet).toHaveProperty('width', 10);
    expect(fleet).toHaveProperty('height', 10);
    expect(Array.isArray(fleet.ships)).toBe(true);
  });

  test('noTouching prevents vertical adjacency on narrow board', () => {
    const cfg = { width: 1, height: 3, ships: [1, 1], noTouching: true };
    const fleet = JSON.parse(generateFleet(JSON.stringify(cfg), env));
    expect(fleet.width).toBe(1);
    expect(fleet.height).toBe(3);
    expect(Array.isArray(fleet.ships)).toBe(true);
    expect(fleet.ships.length).toBe(2);
    const ys = fleet.ships.map(ship => ship.start.y).sort((a, b) => a - b);
    expect(ys).toEqual([0, 2]);
  });

  test('noTouching allows placement when ships are separated', () => {
    const cfg = { width: 3, height: 3, ships: [1, 1], noTouching: true };
    const result = JSON.parse(generateFleet(JSON.stringify(cfg), env));
    expect(Array.isArray(result.ships)).toBe(true);
    expect(result.ships.length).toBe(2);
    const [s1, s2] = result.ships;
    const dx = Math.abs(s1.start.x - s2.start.x);
    const dy = Math.abs(s1.start.y - s2.start.y);
    expect(dx > 1 || dy > 1).toBe(true);
  });

  test('shuffles ship order based on RNG', () => {
    const cfg = { width: 4, height: 4, ships: [1, 2, 3] };
    const env = new Map([['getRandomNumber', () => 0]]);
    const fleet = JSON.parse(generateFleet(JSON.stringify(cfg), env));
    const lengths = fleet.ships.map(ship => ship.length);
    expect(lengths).toEqual([2, 3, 1]);
  });

  test('shuffles ship order differently for non-zero RNG', () => {
    const cfg = { width: 4, height: 4, ships: [1, 2, 3] };
    const env = new Map([['getRandomNumber', () => 0.5]]);
    const fleet = JSON.parse(generateFleet(JSON.stringify(cfg), env));
    const lengths = fleet.ships.map(ship => ship.length);
    expect(lengths).toEqual([1, 3, 2]);
  });
  test('does not mutate the input ship lengths array', () => {
    const cfg = { width: 4, height: 4, ships: [1, 2, 3] };
    const env = new Map([['getRandomNumber', () => 0]]);
    const cfgCopy = { ...cfg, ships: [...cfg.ships] };
    generateFleet(JSON.stringify(cfgCopy), env);
    expect(cfgCopy.ships).toEqual([1, 2, 3]);
  });

  test('noTouching prevents adjacency for mixed ship lengths', () => {
    const cfg = { width: 4, height: 3, ships: [2, 1], noTouching: true };
    const env = new Map([['getRandomNumber', () => 0]]);
    const fleet = JSON.parse(generateFleet(JSON.stringify(cfg), env));
    expect(Array.isArray(fleet.ships)).toBe(true);
    expect(fleet.ships.length).toBe(2);
    const [first, second] = fleet.ships;
    expect(first.start).toHaveProperty('x');
    expect(second.start).toHaveProperty('x');
    const dx = Math.abs(first.start.x - second.start.x);
    const dy = Math.abs(first.start.y - second.start.y);
    expect(dx > 1 || dy > 1).toBe(true);
  });
});
