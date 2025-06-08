import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => c;

describe('date formatting', () => {
  test('publication date is formatted using en-GB locale', () => {
    const blog = {
      posts: [
        {
          key: 'DATE1',
          title: 'Date Post',
          publicationDate: '2024-05-04',
          content: ['entry'],
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<p class="value metadata">4 May 2024</p>');
  });
});
