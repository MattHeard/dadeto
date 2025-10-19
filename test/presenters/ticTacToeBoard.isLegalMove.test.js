import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { beforeAll, describe, test, expect } from '@jest/globals';

let isLegalMove;

beforeAll(async () => {
  const filePath = path.join(process.cwd(), 'src/core/presenters/ticTacToeBoard.js');
  let src = fs.readFileSync(filePath, 'utf8');
  src = src.replace(/from '((?:\.\.?\/)[^']*)'/g, (_, p) => {
    const abs = pathToFileURL(path.join(path.dirname(filePath), p));
    return `from '${abs.href}'`;
  });
  src += '\nexport { isLegalMove };';
  ({ isLegalMove } = await import(
    `data:text/javascript,${encodeURIComponent(src)}`
  ));
});

describe('isLegalMove', () => {
  test('returns false for out-of-bounds column', () => {
    const board = Array.from({ length: 3 }, () => Array(4).fill(' '));
    const move = { player: 'X', position: { row: 0, column: 3 } };
    expect(isLegalMove(move, board)).toBe(false);
  });
});
