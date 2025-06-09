import { test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = html => html;

test('generateBlog formats publication date with short month name', () => {
  const blog = {
    posts: [
      {
        key: 'DATE-SK',
        title: 'Date Survivor',
        publicationDate: '2024-05-04',
        content: ['entry'],
      },
    ],
  };
  const html = generateBlog({ blog, header, footer }, wrapHtml);
  expect(html).toContain('4 May 2024');
});
