import { test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/generator/generator.js';

test('generateBlogOuter uses entry and footer classes', () => {
  const blog = {
    posts: [
      { key: 'A1', title: 'Title', publicationDate: '2024-01-01', content: [] }
    ]
  };
  const html = generateBlogOuter(blog);
  expect(html).toContain('<div class="entry">');
  expect(html).toContain('<article class="entry"');
  expect(html).toContain('class="footer value warning"');
});
