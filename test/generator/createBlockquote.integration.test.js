import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => ['<html>', c, '</html>'].join('');

describe('createBlockquote integration', () => {
  test('generateBlog includes blockquote corners for quote content', () => {
    const blog = {
      posts: [
        {
          key: 'BQ01',
          title: 'Quote Post',
          publicationDate: '2024-06-01',
          content: [{ type: 'quote', content: 'Hello world' }],
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('corner corner-tl');
    expect(html).toContain('corner corner-tr');
    expect(html).toContain('corner corner-bl');
    expect(html).toContain('corner corner-br');
  });
  test('blockquote corners appear exactly four times', () => {
    const blog = {
      posts: [
        {
          key: 'BQ02',
          title: 'Quote Count',
          publicationDate: '2024-06-02',
          content: [{ type: 'quote', content: 'Hello again' }],
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const matches = html.match(/corner-/g) || [];
    expect(matches.length).toBe(4);
  });
});
