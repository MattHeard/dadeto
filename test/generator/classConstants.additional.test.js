import { describe, it, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/build/generator.js';

describe('generator CLASS constants additional', () => {
  it('uses expected CSS classes in generated blog output', () => {
    const blog = {
      posts: [
        {
          key: 'A1',
          title: 'Title',
          publicationDate: '2024-01-01',
          content: [],
        },
      ],
    };
    const html = generateBlogOuter(blog);
    expect(html).toContain('class="entry"');
    expect(html).toContain('class="key article-title"');
    expect(html).toContain('class="footer value warning"');
  });
});
