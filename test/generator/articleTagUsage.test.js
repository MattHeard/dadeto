import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = html => `<html>${html}</html>`;

describe('ARTICLE_TAG_NAME usage', () => {
  test('generateBlog uses article tag for posts', () => {
    const blog = {
      posts: [
        {
          key: 'A1',
          title: 'Post',
          publicationDate: '2024-01-01',
          content: ['text'],
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<article class="entry" id="A1">');
    expect(html).toContain('</article>');
  });
});
