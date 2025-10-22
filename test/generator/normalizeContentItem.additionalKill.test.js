import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => c;

describe('normalizeContentItem additional array kill', () => {
  test('generateBlog renders primitives and quote content in order', () => {
    const blog = {
      posts: [
        {
          key: 'ARR2',
          title: 'Additional Array Post',
          publicationDate: '2024-08-08',
          content: ['one', 2, false, null, { type: 'quote', content: 'Q2' }],
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<p class="value">one</p>');
    expect(html).toContain('<p class="value">2</p>');
    expect(html).toContain('<p class="value">false</p>');
    expect(html).toContain('<p class="value">null</p>');
    expect(html).toContain('<blockquote class="value">');
  });
});
