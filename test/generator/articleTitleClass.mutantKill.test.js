import { describe, it, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/generator/generator.js';

describe('article title class mutant killer', () => {
  it('renders the key div with the article-title class', () => {
    const blog = {
      posts: [
        {
          key: 'A1',
          title: 'Hello',
          publicationDate: '2024-01-01',
          content: []
        }
      ]
    };
    const html = generateBlogOuter(blog);
    expect(html).toMatch(/<div class="key article-title">A1<\/div>/);
  });
});
