import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

const srcPath = path.join(process.cwd(), 'src/browser/toys.js');
const source = fs.readFileSync(srcPath, 'utf8');
const start = source.indexOf('function parseJSONResult');
let braceCount = 0;
let end = start;
for (; end < source.length; end++) {
  const char = source[end];
  if (char === '{') {braceCount++;}
  if (char === '}') {
    braceCount--;
    if (braceCount === 0) {
      end++; // include closing brace
      break;
    }
  }
}
const fnSource = source.slice(start, end);
const parseJSONResult = eval(`(${fnSource})`);

describe('parseJSONResult', () => {
  it('returns parsed object for valid JSON', () => {
    const obj = { a: 1 };
    const result = parseJSONResult(JSON.stringify(obj));
    expect(result).toEqual(obj);
  });

  it('returns null for invalid JSON', () => {
    const result = parseJSONResult('{ invalid');
    expect(result).toBeNull();
  });
});
