import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcPath = path.join(__dirname, '../../src/browser/toys.js');
const src = fs.readFileSync(srcPath, 'utf8');
const fnMatch = src.match(/function parseJSONResult\(result\) \{[\s\S]*?\n\}/);

const parseJSONResult = new Function(`${fnMatch[0]}; return parseJSONResult;`)();

describe('parseJSONResult', () => {
  it('returns parsed object for valid JSON', () => {
    const obj = { a: 1 };
    expect(parseJSONResult(JSON.stringify(obj))).toEqual(obj);
  });

  it('returns null for invalid JSON', () => {
    expect(parseJSONResult('invalid')).toBeNull();
  });
});
