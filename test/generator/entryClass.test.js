import { test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/generator/generator.js';

test('generateBlogOuter applies entry class to header, article, and footer', () => {
  const blog = {
    posts: [
      {
        key: 'a1',
        title: 't',
        publicationDate: '2024-01-01',
        content: ['hello'],
      },
    ],
  };
  const html = generateBlogOuter(blog);
  const matches = html.match(/class="entry"/g) || [];
  expect(matches.length).toBe(3);
});
