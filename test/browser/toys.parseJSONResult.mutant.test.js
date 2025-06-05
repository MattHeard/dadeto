import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

describe('parseJSONResult mutant', () => {
  it('returns null when JSON parsing fails', () => {
    const filePath = path.join(process.cwd(), 'src/browser/toys.js');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const match = fileContents.match(/function parseJSONResult\([^]*?\n\}/);
    const parseJSONResult = eval('(' + match[0] + ')');
    expect(parseJSONResult('not json')).toBeNull();
  });
});
