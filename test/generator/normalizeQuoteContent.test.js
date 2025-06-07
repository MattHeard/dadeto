import { describe, test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/generator/generator.js';

describe('normalizeContentItem with quote object', () => {
  test('generateBlogOuter renders blockquote content', () => {
    const blog = {
      posts: [
        {
          key: 'QUO',
          title: 'Quote Post',
          publicationDate: '2024-06-01',
          content: [
            { type: 'quote', content: 'Hello world' }
          ]
        }
      ]
    };
    const html = generateBlogOuter(blog);
    expect(html).toContain('<blockquote class="value">');
    expect(html).toContain('<p>Hello world</p>');
  });
});
