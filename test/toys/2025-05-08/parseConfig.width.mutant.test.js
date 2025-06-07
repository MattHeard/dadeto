import { describe, test, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

function loadParseConfig() {
  let dir = process.cwd();
  if (dir.includes('.stryker-tmp')) {
    while (path.basename(dir) !== '.stryker-tmp') {
      dir = path.dirname(dir);
    }
    dir = path.dirname(dir);
  }
  const filePath = path.join(dir, 'src/toys/2025-05-08/battleshipSolitaireFleet.js');
  if (process.env.DEBUG_TEST) {
    console.log('reading from', filePath);
  }
  const code = fs.readFileSync(filePath, 'utf8');
  const parseMatch = code.match(/function parseConfig[^]*?return cfg;\s*\}/);
  const ensureMatch = code.match(/function ensureShipsArray[^]*?\n\}/);
  return eval(`(() => {${ensureMatch[0]};${parseMatch[0]}; return parseConfig;})()`);
}

describe('parseConfig width mutant', () => {
  test('preserves non-string width values', () => {
    const parseConfig = loadParseConfig();
    const cfg = { width: true, height: 5, ships: [1] };
    const result = parseConfig(JSON.stringify(cfg));
    expect(result.width).toBe(true);
  });
});
