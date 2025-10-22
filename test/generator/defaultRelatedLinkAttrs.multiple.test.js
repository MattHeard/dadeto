import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => c;

describe('DEFAULT_RELATED_LINK_ATTRS multiple links', () => {
  test('each related link includes target and rel attributes', () => {
    const blog = {
      posts: [
        {
          key: 'P1',
          title: 'Post1',
          publicationDate: '2024-01-01',
          content: ['A'],
          relatedLinks: [
            { url: 'https://a.com', type: 'article', title: 'A1' },
            { url: 'https://b.com', type: 'article', title: 'A2' },
          ],
        },
        {
          key: 'P2',
          title: 'Post2',
          publicationDate: '2024-01-02',
          content: ['B'],
          relatedLinks: [
            { url: 'https://c.com', type: 'article', title: 'C1' },
          ],
        },
      ],
    };

    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const matches = html.match(/target="_blank" rel="noopener"/g) || [];
    expect(matches).toHaveLength(3);
  });
});
