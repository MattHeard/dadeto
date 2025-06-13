import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = html => html;

describe('MEDIA_CONTENT_CONFIG youtube wrapper', () => {
  test('youtube section wrapped in p tag', () => {
    const blog = {
      posts: [
        {
          key: 'YTWRP',
          title: 'Video',
          publicationDate: '2024-09-01',
          youtube: { id: 'abc', timestamp: 0, title: 'Example' },
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const match = html.match(/<p class="value"><iframe[^]*?<\/p>/);
    expect(match).not.toBeNull();
  });
});
