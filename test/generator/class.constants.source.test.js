import { describe, test, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

const srcPath = path.join(process.cwd(), 'src/generator/generator.js');

/** Ensure CLASS constant definitions remain intact */
describe('CLASS constant source', () => {
  test('definition includes all expected class names', () => {
    const src = fs.readFileSync(srcPath, 'utf8');
    const regex =
      /const CLASS = \{\s*KEY: 'key',\s*VALUE: 'value',\s*ENTRY: 'entry',\s*ARTICLE_TITLE: 'article-title',\s*METADATA: 'metadata',\s*FOOTER: 'footer',\s*WARNING: 'warning',\s*MEDIA: 'media',\s*FULL_WIDTH: 'full-width',?\s*\};/s;
    expect(src).toMatch(regex);
  });
});
