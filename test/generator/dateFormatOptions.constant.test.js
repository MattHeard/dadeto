import { describe, test, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

const generatorPath = path.join(process.cwd(), 'src/generator/generator.js');

describe('DATE_FORMAT_OPTIONS constant', () => {
  test('is defined with numeric day, short month, and numeric year', () => {
    const source = fs.readFileSync(generatorPath, 'utf8');
    const regex = /const DATE_FORMAT_OPTIONS = \{\s*day: 'numeric',\s*month: 'short',\s*year: 'numeric',?\s*\}/;
    expect(source).toMatch(regex);
  });
});
