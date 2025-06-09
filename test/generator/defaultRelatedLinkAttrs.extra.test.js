import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => c;

describe('DEFAULT_RELATED_LINK_ATTRS extra check', () => {
  test('generated link has no trailing space before closing bracket', () => {
    const blog = {
      posts: [
        {
          key: 'SPACE',
          title: 'With Space',
          publicationDate: '2025-01-01',
          content: ['x'],
          relatedLinks: [
            { url: 'https://example.com', type: 'article', title: 'Example' },
          ],
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain(
      '<a href="https://example.com" target="_blank" rel="noopener">"Example"</a>'
    );
    expect(html).not.toContain('href="https://example.com" >');
  });
});
