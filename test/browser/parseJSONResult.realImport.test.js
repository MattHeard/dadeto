import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

function loadParseJSONResult() {
  const filename = path.join(process.cwd(), 'src/browser/toys.js');
  const code = fs.readFileSync(filename, 'utf8');
  const match = code.match(/function parseJSONResult\([^]*?\n\}/);
  return eval('(' + match[0] + ')');
}

describe('parseJSONResult real import', () => {
  it('returns null for invalid JSON', () => {
    const parseJSONResult = loadParseJSONResult();
    expect(parseJSONResult('not json')).toBeNull();
  });

  it('parses valid JSON', () => {
    const parseJSONResult = loadParseJSONResult();
    const obj = { foo: 'bar' };
    expect(parseJSONResult(JSON.stringify(obj))).toEqual(obj);
  });
});
