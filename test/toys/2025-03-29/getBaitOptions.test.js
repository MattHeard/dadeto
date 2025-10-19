import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { beforeAll, describe, test, expect } from '@jest/globals';

let getBaitOptions;

beforeAll(async () => {
  const gamePath = path.join(
    process.cwd(),
    'src/core/toys/2025-03-29/fishingGame.js'
  );
  let src = fs.readFileSync(gamePath, 'utf8');
  src = src.replace(/from '\.\/(.*?)'/g, (_, p) => {
    const abs = pathToFileURL(path.join(path.dirname(gamePath), p));
    return `from '${abs.href}'`;
  });
  src += '\nexport { getBaitOptions };';
  ({ getBaitOptions } = await import(
    `data:text/javascript,${encodeURIComponent(src)}`
  ));
});

describe('getBaitOptions', () => {
  test('contains insect with description and modifier', () => {
    const options = getBaitOptions();
    expect(options.insect).toEqual({
      modifier: 0.05,
      description: 'a lively insect',
    });
  });
});
