import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { beforeAll, describe, it, expect } from '@jest/globals';

let parseJSONResult;

beforeAll(async () => {
  const filePath = path.join(process.cwd(), 'src/browser/toys.js');
  let code = fs.readFileSync(filePath, 'utf8');
  code = code.replace(/from '((?:\.\.?\/).*?)'/g, (_, p) => {
    const abs = pathToFileURL(path.join(path.dirname(filePath), p));
    return `from '${abs.href}'`;
  });
  code += '\nexport { parseJSONResult };';
  ({ parseJSONResult } = await import(
    `data:text/javascript,${encodeURIComponent(code)}`
  ));
});

describe('parseJSONResult via dynamic import', () => {
  it('returns null for invalid JSON', () => {
    expect(parseJSONResult('not json')).toBeNull();
  });

  it('parses valid JSON', () => {
    const obj = { a: 1 };
    expect(parseJSONResult(JSON.stringify(obj))).toEqual(obj);
  });
});
