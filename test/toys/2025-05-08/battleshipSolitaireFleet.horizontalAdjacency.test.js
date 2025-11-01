import { describe, test, expect } from '@jest/globals';
import { generateFleet } from '../../../src/core/browser/toys/2025-05-08/battleshipSolitaireFleet.js';

describe('generateFleet noTouching horizontal adjacency', () => {
  test('fails on single row board due to adjacency', () => {
    const cfg = { width: 2, height: 1, ships: [1, 1], noTouching: true };
    const env = new Map([['getRandomNumber', () => 0]]);
    const result = generateFleet(JSON.stringify(cfg), env);
    expect(JSON.parse(result)).toEqual({
      error: 'Failed to generate fleet after max retries',
    });
  });
});
