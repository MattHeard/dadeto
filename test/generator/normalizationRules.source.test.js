import fs from 'fs';
import path from 'path';
import { describe, test, expect } from '@jest/globals';

const sourcePath = path.join(process.cwd(), 'src/generator/generator.js');

describe('normalizationRules constant source', () => {
  test('definition includes default text and identity rules', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    const regex = /const normalizationRules = \[\s*\[\s*c => typeof c !== 'object' \|\| c === null,\s*c => \({ type: 'text', content: c }\),\s*\],\s*\[\(\) => true, c => c\],\s*\];/s;
    expect(src).toMatch(regex);
  });
});
