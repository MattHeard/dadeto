import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { beforeAll, describe, test, expect } from '@jest/globals';

let createValueDiv;

beforeAll(async () => {
  const generatorPath = path.join(process.cwd(), 'src/build/generator.js');
  let src = fs.readFileSync(generatorPath, 'utf8');
  src = src.replace(/from '\.\/(.*?)'/g, (_, p) => {
    const absolute = pathToFileURL(path.join(path.dirname(generatorPath), p));
    return `from '${absolute.href}'`;
  });
  src += '\nexport { createValueDiv };';
  src += `\n//# sourceURL=${generatorPath}`;
  ({ createValueDiv } = await import(
    `data:text/javascript,${encodeURIComponent(src)}`
  ));
});

describe('createValueDiv falsey classes', () => {
  test('filters out falsey additional classes', () => {
    const html = createValueDiv('content', ['', undefined, 'extra']);
    expect(html).toBe('<div class="value   extra">content</div>');
  });

  test('ignores null and zero values in additional classes', () => {
    const html = createValueDiv('text', [null, 0, 'foo']);
    expect(html).toBe('<div class="value  0 foo">text</div>');
  });
});
