import { describe, test, expect } from '@jest/globals';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const filePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../src/generator/generator.js'
);

async function loadDefaultKeyExtraClasses() {
  const code = readFileSync(filePath, 'utf8');
  const injectedPath = path.join(
    path.dirname(filePath),
    `__dke_${process.pid}.js`
  );
  writeFileSync(
    injectedPath,
    `${code}\nexport { defaultKeyExtraClasses as __defaultKeyExtraClasses };`
  );
  const module = await import(injectedPath);
  unlinkSync(injectedPath);
  return module.__defaultKeyExtraClasses;
}

describe('defaultKeyExtraClasses imported', () => {
  test('sets keyExtraClasses to empty string when undefined', async () => {
    const defaultKeyExtraClasses = await loadDefaultKeyExtraClasses();
    const args = {};
    const result = defaultKeyExtraClasses(args);
    expect(result.keyExtraClasses).toBe('');
    expect(args.keyExtraClasses).toBe('');
  });

  test('does not override existing keyExtraClasses when loaded via import', async () => {
    const defaultKeyExtraClasses = await loadDefaultKeyExtraClasses();
    const args = { keyExtraClasses: 'foo' };
    const result = defaultKeyExtraClasses(args);
    expect(result.keyExtraClasses).toBe('foo');
    expect(args.keyExtraClasses).toBe('foo');
  });
});
