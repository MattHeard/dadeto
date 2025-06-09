import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => c;

describe('content renderers mapping', () => {
  test('generateBlog renders text and quote content', () => {
    const blog = {
      posts: [
        {
          key: 'CR1',
          title: 'Content',
          publicationDate: '2024-01-01',
          content: ['hello', { type: 'quote', content: 'q' }],
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<p class="value">hello</p>');
    expect(html).toContain('<blockquote class="value">');
    expect(html).toContain('<p>q</p>');
  });
});
