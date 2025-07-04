import fs from 'fs';
import path from 'path';
import { describe, test, expect } from '@jest/globals';

/**
 * Dynamically imports the ticTacToe module and returns its minimax export.
 * @returns {Promise<Function>} Resolves with the minimax function.
 */
async function loadMinimax() {
  const filePath = path.join(process.cwd(), 'src/toys/2025-04-06/ticTacToe.js');
  let src = fs.readFileSync(filePath, 'utf8');
  src += '\nexport { minimax };';
  const mod = await import(`data:text/javascript,${encodeURIComponent(src)}`);
  return mod.minimax;
}

describe('minimax early return', () => {
  test('returns terminal score when player has already won', async () => {
    const minimax = await loadMinimax();
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
