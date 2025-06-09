import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => ['<html>', c, '</html>'].join('');

describe('BLOCKQUOTE_CORNERS multiple posts', () => {
  test('blockquote corners appear for each quoted post', () => {
    const blog = {
      posts: [
        {
          key: 'BQ1',
          title: 'Quote1',
          publicationDate: '2024-06-03',
          content: [{ type: 'quote', content: 'Hi' }],
        },
        {
          key: 'BQ2',
          title: 'Quote2',
          publicationDate: '2024-06-04',
          content: [{ type: 'quote', content: 'Bye' }],
        },
      ],
    };

    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const matches = html.match(/corner-/g) || [];
    expect(matches).toHaveLength(8);
    expect(html).toContain('<div class="corner corner-tl">');
  });
});
