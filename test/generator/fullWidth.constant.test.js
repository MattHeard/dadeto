import { describe, test, expect, beforeAll } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const generatorPath = path.join(process.cwd(), 'src/generator/generator.js');

let CLASS;

beforeAll(async () => {
  let src = fs.readFileSync(generatorPath, 'utf8');
  src = src.replace(/from '\.\/(.*?)'/g, (_, p) => {
    const abs = pathToFileURL(path.join(path.dirname(generatorPath), p));
    return `from '${abs.href}'`;
  });
  src += '\nexport { CLASS };';
  ({ CLASS } = await import(`data:text/javascript,${encodeURIComponent(src)}`));
});

describe('generator FULL_WIDTH constant', () => {
  test('FULL_WIDTH class is defined correctly', () => {
    const source = fs.readFileSync(generatorPath, 'utf8');
    expect(source).toMatch("FULL_WIDTH: 'full-width'");
  });

  test('imported CLASS exposes FULL_WIDTH constant', () => {
    expect(CLASS.FULL_WIDTH).toBe('full-width');
  });
});
