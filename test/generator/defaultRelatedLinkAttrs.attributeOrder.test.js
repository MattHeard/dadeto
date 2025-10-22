import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => c;

describe('DEFAULT_RELATED_LINK_ATTRS attribute order', () => {
  test('default attributes appear in correct order', () => {
    const blog = {
      posts: [
        {
          key: 'A',
          title: 'Title',
          publicationDate: '2024-01-01',
          content: ['t'],
          relatedLinks: [
            { url: 'https://example.com', type: 'article', title: 'Example' },
          ],
        },
      ],
    };

    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const match = html.match(/<a\b[^>]*https:\/\/example\.com[^>]*>/);
    expect(match).not.toBeNull();
    expect(match[0]).toContain('target="_blank" rel="noopener"');
    // ensure target comes before rel
    expect(match[0].indexOf('target="_blank"')).toBeLessThan(
      match[0].indexOf('rel="noopener"')
    );
  });
});
