import { describe, test, expect, jest } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = html => html;

describe('DATE_FORMAT_OPTIONS runtime', () => {
  test('generateBlog uses short month formatting', () => {
    const blog = {
      posts: [
        {
          key: 'DATE_OPT',
          title: 'Post',
          publicationDate: '2024-05-04',
          content: ['Example'],
        },
      ],
    };

    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<p class="value metadata">4 May 2024</p>');
  });
});
