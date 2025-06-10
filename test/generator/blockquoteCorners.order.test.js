import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = html => html;

describe('BLOCKQUOTE_CORNERS order', () => {
  test('corners appear in correct order at start of blockquote', () => {
    const blog = {
      posts: [
        {
          key: 'BQORD',
          title: 'Corner Order',
          publicationDate: '2024-06-11',
          content: [{ type: 'quote', content: 'Hi' }],
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const start = html.indexOf('<blockquote');
    const snippet = html.slice(start, start + 400);
    const expected =
      '<blockquote class="value"><div class="corner corner-tl"><div class="h-line"></div><div class="v-line"></div></div>' +
      '<div class="corner corner-tr"><div class="h-line"></div><div class="v-line"></div></div>' +
      '<div class="corner corner-bl"><div class="h-line"></div><div class="v-line"></div></div>' +
      '<div class="corner corner-br"><div class="h-line"></div><div class="v-line"></div></div>';
    expect(snippet.startsWith(expected)).toBe(true);
  });
});
