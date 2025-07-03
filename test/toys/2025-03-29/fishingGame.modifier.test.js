import { fishingGame } from '../../../src/toys/2025-03-29/fishingGame.js';
import { describe, test, expect } from '@jest/globals';

/**
 * @param {number} rand
 * @param current
 */
function makeEnv(rand, current) {
  return new Map([
    ['getRandomNumber', () => rand],
    ['getCurrentTime', () => current],
  ]);
}

describe('fishingGame modifier effects', () => {
  test('negative modifier alters outcome category', () => {
    const env = makeEnv(0.33, 0);
    const output = fishingGame('bread', env);
    expect(output).toMatch(/water stays silent/i);
  });
});
