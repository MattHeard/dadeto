import fs from 'fs';
import os from 'os';
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
  const tempPath = path.join(os.tmpdir(), `parse-json-${Date.now()}.mjs`);
  fs.writeFileSync(tempPath, src);
  const mod = await import(pathToFileURL(tempPath));
  fs.unlinkSync(tempPath);
  return mod.parseJSONResult;
}

describe('parseJSONResult via file import', () => {
  it('returns null for invalid JSON', async () => {
    const parseJSONResult = await loadParseJSONResult();
    expect(parseJSONResult('invalid')).toBeNull();
  });

  it('returns object for valid JSON', async () => {
    const parseJSONResult = await loadParseJSONResult();
    expect(parseJSONResult('{"a":1}')).toEqual({ a: 1 });
  });
});
