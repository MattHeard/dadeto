import { describe, test, expect } from '@jest/globals';
import { minimax } from '../../../src/toys/2025-04-06/ticTacToe.js';

describe('minimax early return', () => {
  test('returns terminal score when player has already won', () => {
    const board = [
      ['X', 'X', 'X'],
      [null, null, null],
      [null, null, null],
    ];
    const params = { board, player: 'X', moves: [] };
    const score = minimax(0, true, params);
    expect(score).toBe(10);
  });
});
