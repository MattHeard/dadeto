import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

const filePath = path.resolve('src/browser/toys.js');
const source = fs.readFileSync(filePath, 'utf8');
const match = source.match(/function parseJSONResult\([^]*?\}\n\}/);
const parseJSONResult = eval(`(${match[0]})`);

describe('parseJSONResult', () => {
  it('returns null when JSON parsing fails', () => {
    const result = parseJSONResult('invalid json');
    expect(result).toBeNull();
  });
});
