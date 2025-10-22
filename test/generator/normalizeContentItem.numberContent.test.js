import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => c;

describe('normalizeContentItem numeric content', () => {
  test('generateBlog handles numeric content items', () => {
    const blog = {
      posts: [
        {
          key: 'N1',
          title: 'Number Post',
          publicationDate: '2024-01-01',
          content: [123],
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<p class="value">123</p>');
  });
});
