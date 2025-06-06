import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { describe, it, expect } from '@jest/globals';

async function loadParseJSONResult() {
  const srcPath = path.join(process.cwd(), 'src/browser/toys.js');
  let src = fs.readFileSync(srcPath, 'utf8');
  src = src.replace(/from '((?:\.\.?\/).*?)'/g, (_, p) => {
    const abs = pathToFileURL(path.join(path.dirname(srcPath), p));
    return `from '${abs.href}'`;
  });
  src += '\nexport { parseJSONResult };';
  const mod = await import(`data:text/javascript,${encodeURIComponent(src)}`);
  return mod.parseJSONResult;
}

describe('parseJSONResult dynamic import', () => {
  it('returns null for invalid JSON', async () => {
    const parseJSONResult = await loadParseJSONResult();
    expect(parseJSONResult('invalid')).toBeNull();
  });
  it('parses valid JSON', async () => {
    const parseJSONResult = await loadParseJSONResult();
    const obj = { a: 1 };
    expect(parseJSONResult(JSON.stringify(obj))).toEqual(obj);
  });
});
