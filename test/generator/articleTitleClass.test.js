import { describe, test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/generator/generator.js';

describe('generator article title class', () => {
  test('generated blog includes article-title class', () => {
    const blog = {
      posts: [
        {
          key: 'A1',
          title: 'Hello',
          publicationDate: '2024-01-01',
          content: ['Paragraph'],
        },
      ],
    };
    const html = generateBlogOuter(blog);
    expect(html).toContain('class="key article-title"');
  });
});
