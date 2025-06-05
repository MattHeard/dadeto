import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const filePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/generator/generator.js'
);

function getDefaultKeyExtraClasses() {
  let code = readFileSync(filePath, 'utf8');
  code = code.replace(/^import[^;]*;\n/gm, '');
  code = code.replace(/export (function|const|let|var)/g, '$1');
  return new Function(`${code}; return defaultKeyExtraClasses;`)();
}

describe('defaultKeyExtraClasses', () => {
  test('sets keyExtraClasses to empty string when undefined', () => {
    const defaultKeyExtraClasses = getDefaultKeyExtraClasses();
    const args = {};
    const result = defaultKeyExtraClasses(args);
    expect(result.keyExtraClasses).toBe('');
    expect(args.keyExtraClasses).toBe('');
  });

  test('does not override existing keyExtraClasses', () => {
    const defaultKeyExtraClasses = getDefaultKeyExtraClasses();
    const args = { keyExtraClasses: 'foo' };
    const result = defaultKeyExtraClasses(args);
    expect(result.keyExtraClasses).toBe('foo');
    expect(args.keyExtraClasses).toBe('foo');
  });
});
