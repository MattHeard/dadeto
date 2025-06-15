import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => ['<html>', c, '</html>'].join('');

describe('normalizeContentItem with quote object', () => {
  test('generateBlog renders quote content object', () => {
    const blog = {
      posts: [
        {
          key: 'QUO',
          title: 'Quote Post',
          publicationDate: '2024-06-01',
          content: [
            { type: 'quote', content: 'Hello world' }
          ]
        }
      ]
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<blockquote class="value">');
    expect(html).toContain('<p>Hello world</p>');
  });
});
