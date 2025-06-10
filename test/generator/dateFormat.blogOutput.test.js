import { test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/generator/generator.js';

test('generateBlogOuter formats publication dates in en-GB style', () => {
  const blog = {
    posts: [
      { key: 'D1', title: 'Date Test', publicationDate: '2022-05-04', content: [] }
    ]
  };
  const html = generateBlogOuter(blog);
  expect(html).toContain('4 May 2022');
});
