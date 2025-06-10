import { describe, test, expect } from '@jest/globals';
import { placeAllShips } from '../../../src/toys/2025-05-08/battleshipSolitaireFleet.js';

describe('placeAllShips mutation', () => {
  test.each([
    [{ width: 3, height: 3, ships: [1, 2] }, () => 0],
    [{ width: 3, height: 3, ships: [1, 2, 3] }, () => 0.5],
  ])('does not mutate cfg.ships for %p', (cfg, rnd) => {
    const env = new Map([['getRandomNumber', rnd]]);
    const original = [...cfg.ships];
    placeAllShips(cfg, env);
    expect(cfg.ships).toEqual(original);
  });
});
