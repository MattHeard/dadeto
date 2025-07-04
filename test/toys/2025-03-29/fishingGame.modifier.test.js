import { fishingGame } from '../../../src/toys/2025-03-29/fishingGame.js';
import { describe, test, expect } from '@jest/globals';

/**
 * Create environment map for the fishing game.
 * @param {number} rand - Random value to return.
 * @param {number} current - Current time value.
 * @returns {Map<string, () => number>} Environment map with getters.
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
