import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const filePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/browser/toys.js'
);

function getParseJSONResult() {
  const code = readFileSync(filePath, 'utf8');
  const match = code.match(/function parseJSONResult\(result\) {[^]*?\n}\n/);
  if (!match) {throw new Error('parseJSONResult not found');}

  return new Function(`${match[0]}; return parseJSONResult;`)();
}

describe('parseJSONResult', () => {
  it('returns null when JSON parsing fails', () => {
    const parseJSONResult = getParseJSONResult();
    expect(parseJSONResult('not json')).toBeNull();
  });
});
