import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { beforeAll, describe, test, expect } from '@jest/globals';

let prefixIfPresent;

beforeAll(async () => {
  const generatorPath = path.join(process.cwd(), 'src/generator/generator.js');
  let src = fs.readFileSync(generatorPath, 'utf8');
  src = src.replace(/from '\.\/(.*?)'/g, (_, p) => {
    const absolute = pathToFileURL(path.join(path.dirname(generatorPath), p));
    return `from '${absolute.href}'`;
  });
  src += '\nexport { prefixIfPresent };';
  ({ prefixIfPresent } = await import(
    `data:text/javascript,${encodeURIComponent(src)}`
  ));
});

describe('prefixIfPresent', () => {
  test('returns prefix plus value when value is truthy', () => {
    expect(prefixIfPresent(' by ', 'Alice')).toBe(' by Alice');
  });

  test('returns empty string when value is missing', () => {
    expect(prefixIfPresent(' by ', '')).toBe('');
    expect(prefixIfPresent(' by ', null)).toBe('');
    expect(prefixIfPresent(' by ', undefined)).toBe('');
    expect(prefixIfPresent(' by ', 0)).toBe('');
  });
});
