import { test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/generator/generator.js';

test('generateBlogOuter uses entry class for header, article, and footer', () => {
  const blog = { posts: [{ key: 'count1', title: 't', publicationDate: '2024-01-01', content: [] }] };
  const html = generateBlogOuter(blog);
  const matches = html.match(/class="entry"/g) || [];
  expect(matches.length).toBe(3);
});
