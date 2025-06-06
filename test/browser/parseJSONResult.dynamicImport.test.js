import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { beforeAll, describe, test, expect } from '@jest/globals';

let parseJSONResult;

beforeAll(async () => {
  const file = path.join(process.cwd(), 'src/browser/toys.js');
  let src = fs.readFileSync(file, 'utf8');
  src = src.replace(/from '((?:\.\.?\/).*?)'/g, (_, p) => {
    const abs = pathToFileURL(path.join(path.dirname(file), p));
    return `from '${abs.href}'`;
  });
  src += '\nexport { parseJSONResult };';
  ({ parseJSONResult } = await import(
    `data:text/javascript,${encodeURIComponent(src)}`
  ));
});

describe('parseJSONResult dynamic import', () => {
  test('returns null for invalid JSON', () => {
    expect(parseJSONResult('{ invalid')).toBeNull();
  });

  test('returns object for valid JSON', () => {
    expect(parseJSONResult('{"a":1}')).toEqual({ a: 1 });
  });
});
