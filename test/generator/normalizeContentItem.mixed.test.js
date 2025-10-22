import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => c;

describe('normalizeContentItem mixed content', () => {
  test('generateBlog handles string, number, and null content', () => {
    const blog = {
      posts: [
        {
          key: 'MIX',
          title: 'Mixed Post',
          publicationDate: '2024-06-01',
          content: ['hello', 42, null],
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<p class="value">hello</p>');
    expect(html).toContain('<p class="value">42</p>');
    expect(html).toContain('<p class="value">null</p>');
  });
});
