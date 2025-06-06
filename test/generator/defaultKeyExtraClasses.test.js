import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { beforeAll, describe, test, expect } from '@jest/globals';

let defaultKeyExtraClasses;

beforeAll(async () => {
  const srcPath = path.join(process.cwd(), 'src/generator/generator.js');
  let src = fs.readFileSync(srcPath, 'utf8');
  src = src.replace(/from '\.\/(.*?)'/g, (_, p) => {
    const abs = pathToFileURL(path.join(path.dirname(srcPath), p));
    return `from '${abs.href}'`;
  });
  src += '\nexport { defaultKeyExtraClasses };';
  ({ defaultKeyExtraClasses } = await import(
    `data:text/javascript,${encodeURIComponent(src)}`
  ));
});

describe('defaultKeyExtraClasses', () => {
  test('sets keyExtraClasses to empty string when undefined', () => {
    const result = defaultKeyExtraClasses({});
    expect(result.keyExtraClasses).toBe('');
  });
});
