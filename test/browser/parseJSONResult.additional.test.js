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
  ({ parseJSONResult } = await import(`data:text/javascript,${encodeURIComponent(src)}`));
});

describe('parseJSONResult additional cases', () => {
  it('returns null for JSON with extra characters', () => {
    expect(parseJSONResult('{"a":1} trailing')).toBeNull();
  });

  it('parses valid JSON with surrounding whitespace', () => {
    const obj = { foo: 'bar' };
    const json = `\n  ${JSON.stringify(obj)}  \n`;
    expect(parseJSONResult(json)).toEqual(obj);
  });
});
