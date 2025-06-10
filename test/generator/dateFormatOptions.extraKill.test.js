import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = html => html;

describe('DATE_FORMAT_OPTIONS extra kill', () => {
  test('generateBlog formats dates using short month names', () => {
    const blog = {
      posts: [
        {
          key: 'DF_EXTRA',
          title: 'Example',
          publicationDate: '2024-05-04',
          content: ['x'],
        },
      ],
    };

    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<p class="value metadata">4 May 2024</p>');
    expect(html).not.toContain('04/05/2024');
  });
});
