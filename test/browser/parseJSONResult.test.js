import { describe, it, expect } from '@jest/globals';
import { readFileSync, writeFileSync, promises as fsPromises } from 'fs';
import { join, dirname } from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';

const require = createRequire(import.meta.url);

const filePath = require.resolve('../../src/browser/toys.js');

async function getParseJSONResult() {
  const code = readFileSync(filePath, 'utf8');
  const tempPath = join(dirname(filePath), `parseJSONResult.${Date.now()}.js`);
  writeFileSync(tempPath, `${code}\nexport { parseJSONResult };`);
  const module = await import(`${pathToFileURL(tempPath).href}`);
  const fn = module.parseJSONResult;
  await fsPromises.unlink(tempPath);
  return fn;
}

describe('parseJSONResult', () => {
  it('returns null when JSON parsing fails', async () => {
    const parseJSONResult = await getParseJSONResult();
    expect(parseJSONResult('not json')).toBeNull();
  });

  it('does not return undefined for invalid JSON', async () => {
    const parseJSONResult = await getParseJSONResult();
    expect(parseJSONResult('not json')).not.toBeUndefined();
  });

  it('parses valid JSON into an object', async () => {
    const parseJSONResult = await getParseJSONResult();
    const result = parseJSONResult('{"a":1}');
    expect(result).toEqual({ a: 1 });
  });

  it('returns null when called with undefined', async () => {
    const parseJSONResult = await getParseJSONResult();
    expect(parseJSONResult(undefined)).toBeNull();
  });
});
