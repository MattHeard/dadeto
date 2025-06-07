import { describe, test, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

function loadGetSy() {
  let dir = process.cwd();
  if (dir.includes('.stryker-tmp')) {
    while (path.basename(dir) !== '.stryker-tmp') {
      dir = path.dirname(dir);
    }
    dir = path.dirname(dir);
  }
  const filePath = path.join(dir, 'src/toys/2025-05-08/battleshipSolitaireFleet.js');
  const code = fs.readFileSync(filePath, 'utf8');
  const match = code.match(/function getSy[^]*?return y;\n\s*}\n\s*}/);
  return eval(`(${match[0]})`);
}

describe('getSy mutant', () => {
  test('returns y + i when direction is V', () => {
    const fn = loadGetSy();
    expect(fn('V', 2, 3)).toBe(5);
  });

  test('returns y when direction is H', () => {
    const fn = loadGetSy();
    expect(fn('H', 5, 4)).toBe(5);
  });
});
