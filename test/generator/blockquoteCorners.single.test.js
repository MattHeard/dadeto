import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => ['<html>', c, '</html>'].join('');

describe('BLOCKQUOTE_CORNERS single post', () => {
  test('blockquote corners appear for a quoted post', () => {
    const blog = {
      posts: [
        {
          key: 'BQ1',
          title: 'Quote1',
          publicationDate: '2024-06-03',
          content: [{ type: 'quote', content: 'Hi' }],
        },
      ],
    };

    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const matches = html.match(/corner-/g) || [];
    expect(matches).toHaveLength(4);
    expect(html).toContain('<div class="corner corner-tl">');
  });
});
