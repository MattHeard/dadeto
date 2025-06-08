import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = content => ['<html>', content, '</html>'].join('');

describe('DEFAULT_RELATED_LINK_ATTRS usage', () => {
  test('generated links contain target and rel attributes', () => {
    const blog = {
      posts: [
        {
          key: 'LINK1',
          title: 'Example',
          publicationDate: '2024-01-01',
          content: ['Test'],
          relatedLinks: [
            { url: 'https://example.com', type: 'article', title: 'Example' },
          ],
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('target="_blank" rel="noopener"');
    expect(html).toContain(
      '<a href="https://example.com" target="_blank" rel="noopener">"Example"</a>'
    );
  });

  test('only one set of default attributes appears', () => {
    const blog = {
      posts: [
        {
          key: 'LINK2',
          title: 'Example2',
          publicationDate: '2024-01-02',
          content: ['Test2'],
          relatedLinks: [
            {
              url: 'https://example.com/2',
              type: 'article',
              title: 'Example2',
            },
          ],
        },
      ],
    };

    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const matches = html.match(/target="_blank" rel="noopener"/g) || [];
    expect(matches).toHaveLength(1);
  });
});
