import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => c;

describe('normalizeContentItem array declaration kill', () => {
  test('generateBlog handles multiple primitive content types', () => {
    const blog = {
      posts: [
        {
          key: 'ARR',
          title: 'Array Post',
          publicationDate: '2024-07-04',
          content: ['text', 100, true, null, { type: 'quote', content: 'Q' }],
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<p class="value">text</p>');
    expect(html).toContain('<p class="value">100</p>');
    expect(html).toContain('<p class="value">true</p>');
    expect(html).toContain('<p class="value">null</p>');
    expect(html).toContain('<blockquote class="value">');
  });
});
