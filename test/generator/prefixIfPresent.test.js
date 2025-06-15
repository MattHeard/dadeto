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

  test('returns undefined when value is missing', () => {
    expect(prefixIfPresent(' by ', '')).toBeUndefined();
    expect(prefixIfPresent(' by ', null)).toBeUndefined();
    expect(prefixIfPresent(' by ', undefined)).toBeUndefined();
    expect(prefixIfPresent(' by ', 0)).toBeUndefined();
  });
});
