import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => c;

describe('normalizeContentItem boolean content', () => {
  test('generateBlog handles boolean content items', () => {
    const blog = {
      posts: [
        {
          key: 'B1',
          title: 'Boolean Post',
          publicationDate: '2024-01-01',
          content: [true]
        }
      ]
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<p class="value">true</p>');
  });
});
