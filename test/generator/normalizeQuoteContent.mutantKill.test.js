import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => ['<html>', c, '</html>'].join('');

describe('getContentNormalizer object handling', () => {
  test('generateBlog renders quote content object', () => {
    const blog = {
      posts: [
        {
          key: 'NQMK',
          title: 'Quote Kill',
          publicationDate: '2024-06-15',
          content: [{ type: 'quote', content: 'mutant' }],
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<blockquote class="value">');
    expect(html).toContain('<p>mutant</p>');
  });
});
