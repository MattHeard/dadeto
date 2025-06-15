import { describe, it, expect, jest } from '@jest/globals';
import { generateBlogOuter } from '../../src/generator/generator.js';

describe('generateBlogOuter date formatting', () => {
  it('formats publication dates with short month names', () => {
    const blog = {
      posts: [
        {
          key: 'DF1',
          title: 'Date Test',
          publicationDate: '2024-06-01',
          content: [],
        },
      ],
    };

    const spy = jest.spyOn(Date.prototype, 'toLocaleDateString');
    const html = generateBlogOuter(blog);
    expect(html).toContain('<p class="value metadata">1 Jun 2024</p>');
    expect(spy).toHaveBeenCalledWith('en-GB', expect.any(Object));
    spy.mockRestore();
  });
});
