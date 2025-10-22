import { describe, test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/build/generator.js';

describe('beta release posts', () => {
  test('posts with release beta include release-beta class', () => {
    const blog = {
      posts: [
        {
          key: 'B1',
          title: 'Beta',
          publicationDate: '2024-01-01',
          release: 'beta',
          content: ['text'],
        },
      ],
    };
    const html = generateBlogOuter(blog);
    expect(html).toContain('class="entry release-beta"');
  });
});
