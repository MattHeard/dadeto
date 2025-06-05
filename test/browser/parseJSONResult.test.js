import { beforeAll, describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

let parseJSONResult;

beforeAll(() => {
  const filePath = path.join(process.cwd(), 'src/browser/toys.js');
  const code = fs.readFileSync(filePath, 'utf8');
  const match = code.match(/function parseJSONResult\(result\) {([\s\S]*?)}\n/);
  // eslint-disable-next-line no-new-func
  parseJSONResult = new Function(
    `return function parseJSONResult(result) {${match[1]}}}`
  )();
});

describe('parseJSONResult', () => {
  it('returns parsed object for valid JSON', () => {
    expect(parseJSONResult('{"a":1}')).toEqual({ a: 1 });
  });

  it('returns null for invalid JSON', () => {
    expect(parseJSONResult('invalid')).toBeNull();
  });
});
