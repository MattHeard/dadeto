import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => c;

describe('normalizeContentItem integration', () => {
  test('generateBlog renders string content as paragraphs', () => {
    const blog = {
      posts: [
        {
          key: 'S1',
          title: 'String Post',
          publicationDate: '2024-01-01',
          content: ['Hello world'],
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<div class="key">text</div>');
    expect(html).toContain('<p class="value">Hello world</p>');
  });
});
