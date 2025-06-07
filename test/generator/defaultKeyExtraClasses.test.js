import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { describe, test, expect } from '@jest/globals';

async function loadDefaultKeyExtraClasses() {
  const generatorPath = path.join(process.cwd(), 'src/generator/generator.js');
  let src = fs.readFileSync(generatorPath, 'utf8');
  src = src.replace(/from '\.\/(.*?)'/g, (_, p) => {
    const absolute = pathToFileURL(path.join(path.dirname(generatorPath), p));
    return `from '${absolute.href}'`;
  });
  src += '\nexport { defaultKeyExtraClasses };';
  src += `\n//# sourceURL=${generatorPath}`;
  const mod = await import(`data:text/javascript,${encodeURIComponent(src)}`);
  return mod.defaultKeyExtraClasses;
}

describe('defaultKeyExtraClasses', () => {
  test('initializes undefined property to empty string', async () => {
    const defaultKeyExtraClasses = await loadDefaultKeyExtraClasses();
    const args = {};
    const result = defaultKeyExtraClasses(args);
    expect(result.keyExtraClasses).toBe('');
  });

  test('preserves provided property', async () => {
    const defaultKeyExtraClasses = await loadDefaultKeyExtraClasses();
    const args = { keyExtraClasses: 'existing' };
    const result = defaultKeyExtraClasses(args);
    expect(result.keyExtraClasses).toBe('existing');
  });
});
