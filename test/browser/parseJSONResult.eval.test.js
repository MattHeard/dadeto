import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { beforeAll, describe, test, expect } from '@jest/globals';

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

describe('parseJSONResult eval import', () => {
  test('parses valid JSON', () => {
    const obj = { x: 1 };
    expect(parseJSONResult(JSON.stringify(obj))).toEqual(obj);
  });

  test('returns null for invalid JSON', () => {
    expect(parseJSONResult('{ invalid')).toBeNull();
  });

  test('returns null for undefined input', () => {
    expect(parseJSONResult(undefined)).toBeNull();
  });
});
