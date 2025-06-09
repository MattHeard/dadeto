import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => c;

describe('generateBlog related link quotes', () => {
  test('omits quote parentheses when quote is missing', () => {
    const blog = {
      posts: [
        {
          key: 'QLESS',
          title: 'No Quote',
          publicationDate: '2025-01-01',
          content: ['x'],
          relatedLinks: [
            {
              url: 'https://example.com',
              title: 'Example',
              author: 'Author',
              source: 'Source',
              type: 'article',
            },
          ],
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain(
      '<li><a href="https://example.com" target="_blank" rel="noopener">"Example"</a> by Author, Source</li>'
    );
  });

  test('includes quote when provided', () => {
    const blog = {
      posts: [
        {
          key: 'QWITH',
          title: 'With Quote',
          publicationDate: '2025-01-02',
          content: ['x'],
          relatedLinks: [
            {
              url: 'https://example.com',
              title: 'Example',
              author: 'Author',
              source: 'Source',
              quote: 'Nice',
              type: 'article',
            },
          ],
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain(
      '<li><a href="https://example.com" target="_blank" rel="noopener">"Example"</a> by Author, Source ("Nice")</li>'
    );
  });
});
