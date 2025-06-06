import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { beforeAll, describe, test, expect } from '@jest/globals';

let CLASS;

beforeAll(async () => {
  const generatorPath = path.join(process.cwd(), 'src/generator/generator.js');
  let src = fs.readFileSync(generatorPath, 'utf8');
  src = src.replace(/from '\.\/(.*?)'/g, (_, p) => {
    const absolute = pathToFileURL(path.join(path.dirname(generatorPath), p));
    return `from '${absolute.href}'`;
  });
  src += '\nexport { CLASS };';
  ({ CLASS } = await import(`data:text/javascript,${encodeURIComponent(src)}`));
});

describe('CLASS FULL_WIDTH constant runtime', () => {
  test('FULL_WIDTH has expected value', () => {
    expect(CLASS.FULL_WIDTH).toBe('full-width');
  });
});
