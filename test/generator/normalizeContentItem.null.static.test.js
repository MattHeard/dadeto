import { describe, test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/build/generator.js';

describe('normalizeContentItem null static import', () => {
  test('generateBlogOuter handles null in post content array', () => {
    const blog = {
      posts: [
        {
          key: 'NULL',
          title: 'Null Post',
          publicationDate: '2024-06-01',
          content: [null],
        },
      ],
    };
    const html = generateBlogOuter(blog);
    expect(html).toContain('<p class="value">null</p>');
  });
});
