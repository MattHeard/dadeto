import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = html => html;

describe('ARTICLE_TAG_NAME runtime kill', () => {
  test('generateBlog outputs article tags', () => {
    const blog = {
      posts: [
        {
          key: 'A1',
          title: 'Post',
          publicationDate: '2024-01-01',
          content: ['x'],
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<article class="entry" id="A1">');
    expect(html).toContain('</article>');
    expect(html).not.toContain('<>');
    expect(html).not.toContain('</>');
  });
});
