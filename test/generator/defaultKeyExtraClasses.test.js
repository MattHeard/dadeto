import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const filePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/generator/generator.js'
);

function getDefaultKeyExtraClasses() {
  const code = readFileSync(filePath, 'utf8');
  const match = code.match(/function defaultKeyExtraClasses\([^]*?\n\}/);
  if (!match) {
    throw new Error('defaultKeyExtraClasses not found');
  }
  return new Function(`${match[0]}; return defaultKeyExtraClasses;`)();
}

describe('defaultKeyExtraClasses', () => {
  test('assigns empty string when keyExtraClasses is undefined', () => {
    const defaultKeyExtraClasses = getDefaultKeyExtraClasses();
    const args = {};
    const result = defaultKeyExtraClasses(args);
    expect(result.keyExtraClasses).toBe('');
  });

  test('preserves keyExtraClasses when provided', () => {
    const defaultKeyExtraClasses = getDefaultKeyExtraClasses();
    const args = { keyExtraClasses: 'extra' };
    const result = defaultKeyExtraClasses(args);
    expect(result.keyExtraClasses).toBe('extra');
  });
});
