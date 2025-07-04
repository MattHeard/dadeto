import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { beforeAll, describe, test, expect } from '@jest/globals';

let formatBaseLink;

beforeAll(async () => {
  const generatorPath = path.join(process.cwd(), 'src/generator/generator.js');
  let src = fs.readFileSync(generatorPath, 'utf8');
  src = src.replace(/from '\.\/(.*?)'/g, (_, p) => {
    const absolute = pathToFileURL(path.join(path.dirname(generatorPath), p));
    return `from '${absolute.href}'`;
  });
  src += '\nexport { formatBaseLink };';
  src += `\n//# sourceURL=${generatorPath}`;
  ({ formatBaseLink } = await import(
    `data:text/javascript,${encodeURIComponent(src)}`
  ));
});

describe('formatBaseLink default attributes', () => {
  test('includes target and rel attributes', () => {
    const result = formatBaseLink('article', 'https://example.com', 'Example');
    expect(result).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener">"Example"</a>'
    );
  });
});
