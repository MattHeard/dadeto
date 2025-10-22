import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { beforeAll, describe, test, expect } from '@jest/globals';

let escapeRelatedLinkFields;

beforeAll(async () => {
  const generatorPath = path.join(process.cwd(), 'src/build/generator.js');
  let src = fs.readFileSync(generatorPath, 'utf8');
  src = src.replace(/from '\.\/(.*?)'/g, (_, p) => {
    const absolute = pathToFileURL(path.join(path.dirname(generatorPath), p));
    return `from '${absolute.href}'`;
  });
  src += '\nexport { escapeRelatedLinkFields };';
  ({ escapeRelatedLinkFields } = await import(
    `data:text/javascript,${encodeURIComponent(src)}`
  ));
});

describe('escapeRelatedLinkFields', () => {
  test('fills in empty strings for missing fields', () => {
    const result = escapeRelatedLinkFields({
      url: 'https://example.com',
      type: 'article',
    });
    expect(result).toEqual({
      type: 'article',
      url: 'https://example.com',
      title: '',
      author: '',
      source: '',
      quote: '',
    });
  });
});
