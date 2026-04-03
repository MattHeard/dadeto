import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { beforeAll, describe, test, expect } from '@jest/globals';

let getBaitOptions;

beforeAll(async () => {
  const gamePath = path.join(
    process.cwd(),
    'src/core/browser/toys/2025-03-29/fishingGame.js'
  );
  const commonCorePath = pathToFileURL(
    path.join(process.cwd(), 'src/core/commonCore.js')
  );
  const browserCorePath = pathToFileURL(
    path.join(process.cwd(), 'src/core/browser/browser-core.js')
  );
  let src = fs.readFileSync(gamePath, 'utf8');
  src = src.replace(/from '\.\/(.*?)'/g, (_, p) => {
    const abs = pathToFileURL(path.join(path.dirname(gamePath), p));
    return `from '${abs.href}'`;
  });
  src = src.replace(
    /from '\.\.\/\.\.\/browser-core\.js'/g,
    `from '${browserCorePath.href}'`
  );
  src = src.replace(
    /from '\.\.\/\.\.\/\.\.\/commonCore\.js'/g,
    `from '${commonCorePath.href}'`
  );
  src += '\nexport { getBaitOptions };';
  ({ getBaitOptions } = await import(
    `data:text/javascript,${encodeURIComponent(src)}`
  ));
});

describe('getBaitOptions', () => {
  test('contains insect with description and modifier', () => {
    const options = getBaitOptions();
    expect(options.insect).toBeDefined();
    expect(options.insect.description).toBe('a lively insect');
    expect(options.insect.modifier).toBe(0.05);
  });
});
