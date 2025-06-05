import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const filePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/generator/generator.js'
);

function loadFunction() {
  const code = readFileSync(filePath, 'utf8');
  const match = code.match(/function defaultKeyExtraClasses\([^]*?\n\}/);
  if (!match) {throw new Error('defaultKeyExtraClasses not found');}
  const fn = new Function(
    `${match[0]}; return defaultKeyExtraClasses;\n//# sourceURL=${filePath}`
  );
  return fn();
}

describe('defaultKeyExtraClasses coverage', () => {
  test('sets default when undefined', () => {
    const fn = loadFunction();
    const args = {};
    fn(args);
    expect(args.keyExtraClasses).toBe('');
  });
});
