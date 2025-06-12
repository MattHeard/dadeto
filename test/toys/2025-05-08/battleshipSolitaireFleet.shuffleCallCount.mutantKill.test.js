import { describe, test, expect } from '@jest/globals';
import { placeAllShips } from '../../../src/toys/2025-05-08/battleshipSolitaireFleet.js';

describe('shuffle call count mutant kill', () => {
  test('does not call RNG when array length < 2', () => {
    const cfg = { width: 0, height: 0, ships: [1] };
    let count = 0;
    const env = new Map([
      ['getRandomNumber', () => { count++; return 0; }]
    ]);

    placeAllShips(cfg, env);

    // shuffle should not invoke RNG when length is 1
    expect(count).toBe(0);
  });
});
