import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = html => html;

describe('DATE_FORMAT_OPTIONS constant', () => {
  test('generates dates in "4 May 2024" format', () => {
    const blog = {
      posts: [
        {
          key: 'CONST',
          title: 'Const Test',
          publicationDate: '2024-05-04',
          content: ['x'],
        },
      ],
    };

    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<p class="value metadata">4 May 2024</p>');
  });
});
