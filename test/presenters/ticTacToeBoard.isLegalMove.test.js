import { describe, test, expect } from '@jest/globals';
import { isLegalMove } from '../../src/core/browser/presenters/ticTacToeBoard.js';

describe('isLegalMove', () => {
  test('returns false for out-of-bounds column', () => {
    const board = Array.from({ length: 3 }, () => Array(4).fill(' '));
    const move = { player: 'X', position: { row: 0, column: 3 } };
    expect(isLegalMove(move, board)).toBe(false);
  });
});
