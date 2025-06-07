import { describe, test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/generator/generator.js';

describe('media sections mutant', () => {
  test('blog html should not contain undefined when media present', () => {
    const blog = {
      posts: [
        {
          key: 'VIDE1',
          title: 'Video Post',
          publicationDate: '2024-01-01',
          youtube: { id: 'abc123', timestamp: 0, title: 'Example' },
        },
      ],
    };
    const html = generateBlogOuter(blog);
    expect(html.includes('undefined')).toBe(false);
    expect(html).toContain('<iframe');
  });
});
