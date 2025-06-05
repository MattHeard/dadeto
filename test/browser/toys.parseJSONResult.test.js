import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src/browser/toys.js');
const source = fs.readFileSync(filePath, 'utf8');
const match = source.match(/function parseJSONResult\(result\)[\s\S]*?\n}\n/);
const parseJSONResult = match ? eval('(' + match[0] + ')') : undefined;

describe('parseJSONResult', () => {
  it('returns object for valid JSON', () => {
    expect(parseJSONResult('{"a":1}')).toEqual({ a: 1 });
  });

  it('returns null for invalid JSON', () => {
    expect(parseJSONResult('{invalid')).toBeNull();
  });
});
