import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { beforeAll, describe, it, expect } from '@jest/globals';

let isValidPosition;
let hasValidPositionWithEmptyCell;
let isCellEmpty;

beforeAll(async () => {
  const filePath = path.join(
    process.cwd(),
    'src/core/browser/presenters/ticTacToeBoard.js'
  );
  let src = fs.readFileSync(filePath, 'utf8');
  src = src.replace(/from '((?:\.?\.?\/)[^']*)'/g, (_, p) => {
    const abs = pathToFileURL(path.join(path.dirname(filePath), p));
    return `from '${abs.href}'`;
  });
  src +=
    '\nexport { isValidPosition, hasValidPositionWithEmptyCell, isCellEmpty };';
  ({
    isValidPosition: isValidPosition,
    hasValidPositionWithEmptyCell: hasValidPositionWithEmptyCell,
    isCellEmpty: isCellEmpty,
  } = await import(`data:text/javascript,${encodeURIComponent(src)}`));
});

describe('ticTacToeBoard validation helpers', () => {
  it('rejects undefined positions', () => {
    expect(isValidPosition(undefined)).toBe(false);
  });

  it('rejects positions with a non-numeric column', () => {
    const candidate = { row: 1, column: 'x' };
    expect(isValidPosition(candidate)).toBe(false);
  });

  it('rejects positions whose cell is already occupied', () => {
    const board = Array.from({ length: 3 }, () => Array(3).fill('X'));
    const move = { position: { row: 0, column: 0 } };
    expect(hasValidPositionWithEmptyCell(move, board)).toBe(false);
  });

  it('accepts valid positions pointing at empty cells', () => {
    const board = Array.from({ length: 3 }, () => Array(3).fill(' '));
    const move = { position: { row: 2, column: 1 } };
    expect(hasValidPositionWithEmptyCell(move, board)).toBe(true);
    expect(isCellEmpty(move.position, board)).toBe(true);
  });
});
