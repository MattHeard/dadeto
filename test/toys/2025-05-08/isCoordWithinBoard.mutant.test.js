import { describe, test, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

function loadIsCoordWithinBoard() {
  const filePath = path.join(
    process.cwd(),
    'src/toys/2025-05-08/battleshipSolitaireFleet.js'
  );
  const code = fs.readFileSync(filePath, 'utf8');
  const match = code.match(/function isCoordWithinBoard[^]*?\{[^]*?\}/);
  return eval(`(${match[0]})`);
}

describe('isCoordWithinBoard mutant', () => {
  test('returns false when coordinate equals board width or height', () => {
    const fn = loadIsCoordWithinBoard();
    const cfg = { width: 3, height: 2 };
    expect(fn({ x: 3, y: 0 }, cfg)).toBe(false);
    expect(fn({ x: 0, y: 2 }, cfg)).toBe(false);
  });

  test('returns true for coordinates strictly within bounds', () => {
    const fn = loadIsCoordWithinBoard();
    const cfg = { width: 3, height: 2 };
    expect(fn({ x: 0, y: 0 }, cfg)).toBe(true);
    expect(fn({ x: 2, y: 1 }, cfg)).toBe(true);
  });
});
