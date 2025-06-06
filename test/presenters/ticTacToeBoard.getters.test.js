import fs from 'fs';
import path from 'path';
import { describe, test, expect } from '@jest/globals';

function loadFunction(name) {
  const filePath = path.join(process.cwd(), 'src/presenters/ticTacToeBoard.js');
  const source = fs.readFileSync(filePath, 'utf8');
  const start = source.indexOf(`function ${name}`);
  let braceCount = 0;
  let end = start;
  for (; end < source.length; end++) {
    const char = source[end];
    if (char === '{') {braceCount++;}
    if (char === '}') {
      braceCount--;
      if (braceCount === 0) { end++; break; }
    }
  }
  const fnSource = source.slice(start, end);
  return eval(`(${fnSource})`);
}

describe('ticTacToeBoard getters', () => {
  test('getPlayer handles null input', () => {
    const getPlayer = loadFunction('getPlayer');
    expect(() => getPlayer(null)).not.toThrow();
    expect(getPlayer(null)).toBeUndefined();
  });

  test('getPosition handles undefined input', () => {
    const getPosition = loadFunction('getPosition');
    expect(() => getPosition(undefined)).not.toThrow();
    expect(getPosition(undefined)).toBeUndefined();
  });
});
