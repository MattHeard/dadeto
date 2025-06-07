import { describe, test, expect } from '@jest/globals';
import { placeAllShips } from '../../../src/toys/2025-05-08/battleshipSolitaireFleet.js';

describe('placeAllShips input mutation', () => {
  test('shuffling does not alter cfg.ships array', () => {
    const cfg = { width: 3, height: 3, ships: [1, 2, 3] };
    const env = new Map([['getRandomNumber', () => 0.5]]);
    const original = [...cfg.ships];
    placeAllShips(cfg, env);
    expect(cfg.ships).toEqual(original);
  });
});
