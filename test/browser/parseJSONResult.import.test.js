import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { beforeAll, describe, it, expect } from '@jest/globals';

let parseJSONResult;

beforeAll(async () => {
  const srcPath = path.join(process.cwd(), 'src/browser/toys.js');
  let src = fs.readFileSync(srcPath, 'utf8');
  src = src.replace(/from '((?:\.\.?\/).*?)'/g, (_, p) => {
    const abs = pathToFileURL(path.join(path.dirname(srcPath), p));
    return `from '${abs.href}'`;
  });
  src += '\nexport { parseJSONResult };';
  ({ parseJSONResult } = await import(
    `data:text/javascript,${encodeURIComponent(src)}`
  ));
});

describe('parseJSONResult dynamic import', () => {
  it('returns null for invalid JSON', () => {
    expect(parseJSONResult('invalid')).toBeNull();
  });
  it('parses valid JSON', () => {
    const obj = { a: 1 };
    expect(parseJSONResult(JSON.stringify(obj))).toEqual(obj);
  });
});
