import { describe, test, expect } from '@jest/globals';
import { generateFleet } from '../../../src/core/browser/toys/2025-05-08/battleshipSolitaireFleet.js';

const env = new Map([['getRandomNumber', () => 0]]);

describe('parseConfig width mutant', () => {
  test('preserves non-string width values', () => {
    const cfg = { width: true, height: 2, ships: [1] };
    const result = JSON.parse(generateFleet(JSON.stringify(cfg), env));
    expect(result.width).toBe(true);
  });
});
