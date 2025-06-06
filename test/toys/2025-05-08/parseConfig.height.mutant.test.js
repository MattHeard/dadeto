import { describe, test, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

function loadParseConfig() {
  const filePath = path.join(process.cwd(), 'src/toys/2025-05-08/battleshipSolitaireFleet.js');
  const code = fs.readFileSync(filePath, 'utf8');
  const parseMatch = code.match(/function parseConfig[^]*?return cfg;\n\}/);
  const ensureMatch = code.match(/function ensureShipsArray[^]*?\n\}/);
  return eval(`(() => {${ensureMatch[0]};${parseMatch[0]}; return parseConfig;})()`);
}

describe('parseConfig height mutant', () => {
  test('preserves non-string height values', () => {
    const parseConfig = loadParseConfig();
    const cfg = { width: 5, height: true, ships: [1] };
    const result = parseConfig(JSON.stringify(cfg));
    expect(result.height).toBe(true);
  });
});
