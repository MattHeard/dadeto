import { describe, test, expect } from '@jest/globals';
import { generateFleet } from '../../../src/core/toys/2025-05-08/battleshipSolitaireFleet.js';

const env = new Map([['getRandomNumber', () => 0]]);

describe('parseConfig height mutant', () => {
  test('preserves non-string height values', () => {
    const cfg = { width: 5, height: true, ships: [1] };
    const result = JSON.parse(generateFleet(JSON.stringify(cfg), env));
    expect(result.height).toBe(true);
  });
});
