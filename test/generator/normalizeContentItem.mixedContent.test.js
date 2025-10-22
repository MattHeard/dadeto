import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => c;

describe('normalizeContentItem mixed content array', () => {
  test('generateBlog handles string, number, null and quote content', () => {
    const blog = {
      posts: [
        {
          key: 'MIX',
          title: 'Mixed',
          publicationDate: '2024-01-01',
          content: ['a', 42, null, { type: 'quote', content: 'Q' }],
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<p class="value">a</p>');
    expect(html).toContain('<p class="value">42</p>');
    expect(html).toContain('<p class="value">null</p>');
    expect(html).toContain('<blockquote class="value">');
    expect(html).toContain('<p>Q</p>');
  });
});
