import { test, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const filePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../src/toys/2025-04-06/ticTacToe.js'
);

function getApplyMovesSequentially() {
  let code = readFileSync(filePath, 'utf8');
  code = code.replace(/^export /gm, '');
  return new Function(`${code}; return applyMovesSequentially;`)();
}

test('applyMovesSequentially returns valid true for empty moves', () => {
  const applyMovesSequentially = getApplyMovesSequentially();
  const board = Array.from({ length: 3 }, () => Array(3).fill(null));
  const moves = [];
  const seen = new Set();
  const result = applyMovesSequentially(moves, board, seen);
  expect(result).toEqual({ valid: true, earlyWin: false });
});
