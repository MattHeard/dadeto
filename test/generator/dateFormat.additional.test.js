import { test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = html => html;

test('generateBlog formats another publication date with short month', () => {
  const blog = {
    posts: [
      {
        key: 'DATE2',
        title: 'Another Date',
        publicationDate: '2025-12-31',
        content: ['entry'],
      },
    ],
  };
  const html = generateBlog({ blog, header, footer }, wrapHtml);
  expect(html).toContain('31 Dec 2025');
});
