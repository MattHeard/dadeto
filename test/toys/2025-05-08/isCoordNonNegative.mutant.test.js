import { describe, test, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

function loadIsCoordNonNegative() {
  const filePath = path.join(
    process.cwd(),
    'src/toys/2025-05-08/battleshipSolitaireFleet.js'
  );
  const code = fs.readFileSync(filePath, 'utf8');
  const match = code.match(/function isCoordNonNegative[^]*?\{[^]*?\}/);
  return eval(`(${match[0]})`);
}

describe('isCoordNonNegative mutant', () => {
  test('returns false when either coordinate is negative', () => {
    const fn = loadIsCoordNonNegative();
    expect(fn({ x: -1, y: 0 })).toBe(false);
    expect(fn({ x: 0, y: -1 })).toBe(false);
  });

  test('returns true when both coordinates are non-negative', () => {
    const fn = loadIsCoordNonNegative();
    expect(fn({ x: 0, y: 0 })).toBe(true);
    expect(fn({ x: 2, y: 3 })).toBe(true);
  });
});
