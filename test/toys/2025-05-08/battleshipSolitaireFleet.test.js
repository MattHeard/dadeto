import { generateFleet } from '../../../src/toys/2025-05-08/battleshipSolitaireFleet.js';
import { describe, test, expect } from '@jest/globals';

describe('generateFleet', () => {
  // Minimal env mock
  const env = new Map([
    ['getRandomNumber', () => 0], // Always pick first candidate
  ]);

  test('returns empty fleet for invalid JSON', () => {
    const result = generateFleet('not a json', env);
    expect(JSON.parse(result)).toEqual({ width: undefined, height: undefined, ships: [] });
  });

  test('returns empty fleet for missing ships', () => {
    const cfg = { width: 4, height: 4 };
    const result = generateFleet(JSON.stringify(cfg), env);
    expect(JSON.parse(result)).toEqual({ width: 4, height: 4, ships: [] });
  });

  test('returns error if ship segments exceed board area', () => {
    const cfg = { width: 2, height: 2, ships: [3,3] };
    const result = generateFleet(JSON.stringify(cfg), env);
    expect(JSON.parse(result)).toEqual({ error: 'Ship segments exceed board area' });
  });

  test('generates a valid fleet for simple input', () => {
    const cfg = { width: 4, height: 4, ships: [2,2] };
    const result = generateFleet(JSON.stringify(cfg), env);
    const fleet = JSON.parse(result);
    expect(fleet.width).toBe(4);
    expect(fleet.height).toBe(4);
    expect(Array.isArray(fleet.ships)).toBe(true);
    expect(fleet.ships.length).toBe(2);
    // Check expected structure
    for (const ship of fleet.ships) {
      expect(typeof ship.length).toBe('number');
      expect(['H','V']).toContain(ship.direction);
      expect(typeof ship.start.x).toBe('number');
      expect(typeof ship.start.y).toBe('number');
    }
  });

  test('ignores diagonalAllowed property', () => {
    const cfg = { width: 4, height: 4, ships: [2], diagonalAllowed: true };
    const result = generateFleet(JSON.stringify(cfg), env);
    const fleet = JSON.parse(result);
    expect(fleet.width).toBe(4);
    expect(fleet.height).toBe(4);
    expect(Array.isArray(fleet.ships)).toBe(true);
  });
});
