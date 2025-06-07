import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

function loadParseJSONResult() {
  const id = require.resolve('../../src/browser/toys.js');
  require(id); // ensure module is loaded (mutated path when running under Stryker)
  const filename = require.cache[id].filename; // path to file (mutated by Stryker)
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
