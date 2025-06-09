import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = html => ['<html>', html, '</html>'].join('');

describe('BLOCKQUOTE_CORNERS inside blockquote', () => {
  test('corners appear within the blockquote element', () => {
    const blog = {
      posts: [
        {
          key: 'BQINSIDE',
          title: 'Quote',
          publicationDate: '2024-06-10',
          content: [{ type: 'quote', content: 'Hi' }],
        },
      ],
    };

    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const match = html.match(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/);
    expect(match).not.toBeNull();
    const inner = match[1];
    expect(inner).toContain('<div class="corner corner-tl">');
    expect(inner).toContain('<div class="corner corner-tr">');
    expect(inner).toContain('<div class="corner corner-bl">');
    expect(inner).toContain('<div class="corner corner-br">');
  });
});
