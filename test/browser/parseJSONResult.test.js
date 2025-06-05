import { describe, it, expect } from '@jest/globals';
import { readFileSync, writeFileSync, promises as fsPromises } from 'fs';
import { join, dirname } from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';

const require = createRequire(import.meta.url);

const filePath = require.resolve('../../src/browser/toys.js');

async function getParseJSONResult() {
  const code = readFileSync(filePath, 'utf8');
  const tempPath = join(dirname(filePath), `parseJSONResult.${Date.now()}.mjs`);
  writeFileSync(tempPath, `${code}\nexport { parseJSONResult };`);
  const module = await import(`${pathToFileURL(tempPath).href}`);
  const fn = module.parseJSONResult;
  await fsPromises.unlink(tempPath);
  return fn;
}

function getParseJSONResultSync() {
  const code = readFileSync(filePath, 'utf8');
  const match = code.match(/function parseJSONResult\(result\) {[^]*?\n}\n/);
  if (!match) {
    throw new Error('parseJSONResult not found');
  }
  return new Function(`${match[0]}; return parseJSONResult;`)();
}

describe('parseJSONResult', () => {
  it('returns null when JSON parsing fails', async () => {
    const parseJSONResult = await getParseJSONResult();
    expect(parseJSONResult('not json')).toBeNull();
  });

  it('parses valid JSON into an object', async () => {
    const parseJSONResult = await getParseJSONResult();
    const result = parseJSONResult('{"a":1}');
    expect(result).toEqual({ a: 1 });
  });

  it('sync extraction returns null for invalid JSON', () => {
    const parseJSONResult = getParseJSONResultSync();
    expect(parseJSONResult('bad')).toBeNull();
  });

  it('sync extraction parses valid JSON', () => {
    const parseJSONResult = getParseJSONResultSync();
    expect(parseJSONResult('{"b":2}')).toEqual({ b: 2 });
  });
});
