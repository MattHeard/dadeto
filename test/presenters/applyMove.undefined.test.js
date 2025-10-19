import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { beforeAll, describe, test, expect } from '@jest/globals';

let applyMove;

beforeAll(async () => {
  const filePath = path.join(process.cwd(), 'src/core/presenters/ticTacToeBoard.js');
  let src = fs.readFileSync(filePath, 'utf8');
  src = src.replace(/from '((?:\.\.?\/)[^']*)'/g, (_, p) => {
    const absolute = pathToFileURL(path.join(path.dirname(filePath), p));
    return `from '${absolute.href}'`;
  });
  src += '\nexport { applyMove };';
  ({ applyMove } = await import(
    `data:text/javascript,${encodeURIComponent(src)}`
  ));
});

describe('applyMove', () => {
  test('handles undefined move without throwing', () => {
    const board = Array.from({ length: 3 }, () => Array(3).fill(' '));
    expect(() => applyMove(undefined, board)).not.toThrow();
    expect(board).toEqual([
      [' ', ' ', ' '],
      [' ', ' ', ' '],
      [' ', ' ', ' '],
    ]);
  });
});
