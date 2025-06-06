import { describe, test, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

function loadNeighbours() {
  const filePath = path.join(process.cwd(), 'src/toys/2025-05-08/battleshipSolitaireFleet.js');
  const code = fs.readFileSync(filePath, 'utf8');
  const match = code.match(/function isOrigin[^]*?function neighbours\([^]*?\n\}/);
  return eval(`(() => {${match[0]}; return neighbours;})()`);
}

describe('neighbours mutants', () => {
  test('does not include origin coordinate', () => {
    const neighbours = loadNeighbours();
    const result = neighbours({ x: 1, y: 2 });
    const hasOrigin = result.some(c => c.x === 1 && c.y === 2);
    expect(hasOrigin).toBe(false);
    expect(result).toHaveLength(8);
  });
});
