import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const filePath = require.resolve('../../src/browser/toys.js');

function getParseJSONResult() {
  const code = readFileSync(filePath, 'utf8');
  const match = code.match(/function parseJSONResult\(result\) {[^]*?\n}\n/);
  if (!match) {
    throw new Error('parseJSONResult not found');
  }

  return new Function(`${match[0]}; return parseJSONResult;`)();
}

describe('parseJSONResult', () => {
  it('returns null when JSON parsing fails', () => {
    const parseJSONResult = getParseJSONResult();
    expect(parseJSONResult('not json')).toBeNull();
  });

  it('parses valid JSON into an object', () => {
    const parseJSONResult = getParseJSONResult();
    const result = parseJSONResult('{"a":1}');
    expect(result).toEqual({ a: 1 });
  });
});
