import { describe, it, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/generator/generator.js';

describe('generateBlogOuter date formatting', () => {
  it('formats publication dates with short month names', () => {
    const blog = {
      posts: [
        { key: 'DF1', title: 'Date Test', publicationDate: '2024-06-01', content: [] },
      ],
    };

    const html = generateBlogOuter(blog);
    expect(html).toContain('<p class="value metadata">1 Jun 2024</p>');
  });
});
