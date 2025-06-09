import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = html => html;

describe('ARTICLE_TAG_NAME count', () => {
  test('number of <article> tags matches posts length', () => {
    const blog = {
      posts: [
        { key: 'A1', title: 'One', publicationDate: '2024-01-01', content: ['x'] },
        { key: 'A2', title: 'Two', publicationDate: '2024-01-02', content: ['y'] },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const matches = html.match(/<article\b/g) || [];
    expect(matches).toHaveLength(blog.posts.length);
    expect(html).toContain('</article>');
  });
});
