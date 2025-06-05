import { describe, test, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

const generatorPath = path.join(process.cwd(), 'src/generator/generator.js');

describe('generator FULL_WIDTH constant', () => {
  test('FULL_WIDTH class is defined correctly', () => {
    const source = fs.readFileSync(generatorPath, 'utf8');
    expect(source).toMatch("FULL_WIDTH: 'full-width'");
  });
});
