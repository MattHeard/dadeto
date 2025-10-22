import { describe, test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/build/generator.js';

describe('CLASS.KEY constant usage', () => {
  test('generateBlogOuter uses "key" CSS class for labels', () => {
    const blog = {
      posts: [
        {
          key: 'CK',
          title: 'Key Const',
          publicationDate: '2024-01-01',
          content: [],
        },
      ],
    };
    const html = generateBlogOuter(blog);
    const regex = /<div class="key[^"]*">/g;
    const matches = html.match(regex) || [];
    expect(matches.length).toBeGreaterThan(0);
  });
});
