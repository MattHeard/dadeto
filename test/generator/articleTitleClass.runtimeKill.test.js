import { test, expect } from '@jest/globals';

// Dynamically import within the test so Stryker associates coverage

test('generateBlogOuter uses article-title class when module loaded at runtime', async () => {
  const { generateBlogOuter } = await import('../../src/generator/generator.js');
  const blog = {
    posts: [
      {
        key: 'A1',
        title: 'Hello',
        publicationDate: '2024-01-01',
        content: []
      }
    ]
  };
  const html = generateBlogOuter(blog);
  expect(html).toMatch(/<div class="key article-title">A1<\/div>/);
});
