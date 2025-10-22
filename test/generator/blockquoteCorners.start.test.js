import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => ['<html>', c, '</html>'].join('');

describe('BLOCKQUOTE_CORNERS placement', () => {
  test('blockquote corners appear immediately after blockquote tag', () => {
    const blog = {
      posts: [
        {
          key: 'BQSTART',
          title: 'Quote Start',
          publicationDate: '2024-06-05',
          content: [{ type: 'quote', content: 'Hi there' }],
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain(
      '<blockquote class="value"><div class="corner corner-tl"'
    );
  });
});
