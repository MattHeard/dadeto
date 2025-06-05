import { test, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const filePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../src/toys/2025-04-06/ticTacToe.js'
);

function getMakeAccumulateScores(minimaxStub) {
  const code = readFileSync(filePath, 'utf8');
  const makeMatch = code.match(/function makeAccumulateScores\([^]*?\n\}/);
  const oppMatch = code.match(/function getOpponent\([^]*?\n\}/);
  if (!makeMatch || !oppMatch) {
    throw new Error('makeAccumulateScores not found');
  }
  const getOpponent = new Function(`${oppMatch[0]}; return getOpponent;`)();
  return new Function(
    'minimax',
    'getOpponent',
    `${makeMatch[0]}; return makeAccumulateScores;`
  )(minimaxStub, getOpponent);
}

test('makeAccumulateScores sets opponent value when isMax false', () => {
  let boardUsed;
  const minimaxStub = (depth, isMax, params) => {
    boardUsed = params.board;
    return 0;
  };
  const makeAccumulateScores = getMakeAccumulateScores(minimaxStub);
  const board = Array.from({ length: 3 }, () => Array(3).fill(null));
  const params = { board, player: 'X', moves: [] };
  const accumulateScores = makeAccumulateScores(params, 0, false);
  accumulateScores([], [0, 1]);
  expect(boardUsed[0][1]).toBe('O');
});
