import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const filePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/generator/generator.js'
);

describe('createValueDiv source', () => {
  test('contains filter call', () => {
    const code = readFileSync(filePath, 'utf8');
    const match = code.match(/function createValueDiv\([^]*?\n\}/);
    expect(match).toBeTruthy();
    expect(match[0]).toContain('.filter(Boolean)');
  });
});
