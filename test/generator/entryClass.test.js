import { test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/generator/generator.js';

test('generateBlogOuter includes entry class in article and sections', () => {
  const blog = { posts: [{ key: 'a1', content: ['hello'] }] };
  const html = generateBlogOuter(blog);
  expect(html).toContain('class="entry"');
});
