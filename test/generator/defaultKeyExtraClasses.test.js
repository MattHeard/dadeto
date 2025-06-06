import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { beforeAll, describe, test, expect } from '@jest/globals';

let defaultKeyExtraClasses;

beforeAll(async () => {
  const generatorPath = path.join(process.cwd(), 'src/generator/generator.js');
  let src = fs.readFileSync(generatorPath, 'utf8');
  src = src.replace(/from '\.\/(.*?)'/g, (_, p) => {
    const absolute = pathToFileURL(path.join(path.dirname(generatorPath), p));
    return `from '${absolute.href}'`;
  });
  src += '\nexport { defaultKeyExtraClasses };';
  src += `\n//# sourceURL=${generatorPath}`;
  ({ defaultKeyExtraClasses } = await import(
    `data:text/javascript,${encodeURIComponent(src)}`
  ));
});

describe('defaultKeyExtraClasses', () => {
  test('initializes undefined property to empty string', () => {
    const args = {};
    const result = defaultKeyExtraClasses(args);
    expect(result.keyExtraClasses).toBe('');
  });

  test('preserves provided property', () => {
    const args = { keyExtraClasses: 'existing' };
    const result = defaultKeyExtraClasses(args);
    expect(result.keyExtraClasses).toBe('existing');
  });
});
