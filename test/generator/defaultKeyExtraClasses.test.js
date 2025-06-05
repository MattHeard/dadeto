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
  test('sets keyExtraClasses to empty string when undefined', () => {
    const defaultKeyExtraClasses = getDefaultKeyExtraClasses();
    const args = {};
    const result = defaultKeyExtraClasses(args);
    expect(result.keyExtraClasses).toBe('');
    expect(args.keyExtraClasses).toBe('');
  });
});
