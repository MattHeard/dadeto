import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = html => html;

describe('DATE_FORMAT_OPTIONS mutant killer', () => {
  test('generateBlog formats dates with short month names', () => {
    const blog = {
      posts: [
        {
          key: 'DATE_KILL',
          title: 'Kill Mutant',
          publicationDate: '2024-05-04',
          content: ['Entry'],
        },
      ],
    };

    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<p class="value metadata">4 May 2024</p>');
  });
});
