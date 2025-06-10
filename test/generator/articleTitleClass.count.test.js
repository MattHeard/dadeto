import { describe, test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/generator/generator.js';

describe('generator article-title class count', () => {
  test('appears once per post', () => {
    const blog = {
      posts: [
        { key: 'A1', title: 'One', publicationDate: '2024-01-01', content: [] },
        { key: 'B2', title: 'Two', publicationDate: '2024-01-02', content: [] },
      ],
    };
    const html = generateBlogOuter(blog);
    const matches = html.match(/class="key article-title"/g) || [];
    expect(matches.length).toBe(blog.posts.length);
  });
});
