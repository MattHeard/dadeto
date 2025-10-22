import { beforeAll, describe, test, expect } from '@jest/globals';

let generateBlog;

beforeAll(async () => {
  ({ generateBlog } = await import('../../src/build/generator.js'));
});

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => ['<html>', c, '</html>'].join('');

describe('isNonEmptyArray/hasRelatedLinks via generateBlog', () => {
  test('does not render related links for empty array', () => {
    const blog = {
      posts: [
        {
          key: 'EMPTY',
          title: 'Empty',
          publicationDate: '2024-06-01',
          content: ['text'],
          relatedLinks: [],
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).not.toContain('related-links');
  });

  test('does not render related links for non-array value', () => {
    const blog = {
      posts: [
        {
          key: 'STR',
          title: 'String',
          publicationDate: '2024-06-02',
          content: ['text'],
          relatedLinks: 'not-an-array',
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).not.toContain('related-links');
  });

  test('renders related links when array has items', () => {
    const blog = {
      posts: [
        {
          key: 'ONE',
          title: 'One',
          publicationDate: '2024-06-03',
          content: ['text'],
          relatedLinks: [
            {
              url: 'https://example.com',
              title: 'Example',
              author: 'Author',
              type: 'article',
            },
          ],
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<ul class="related-links">');
    expect(html).toContain('https://example.com');
  });

  test('does not render related links when getter returns empty array on second access', () => {
    let callCount = 0;
    const post = {
      key: 'DYN',
      title: 'Dynamic',
      publicationDate: '2024-06-04',
      content: ['text'],
      get relatedLinks() {
        callCount += 1;
        if (callCount === 1) {
          return [
            {
              url: 'https://example.com',
              title: 'Example',
              author: 'Author',
              type: 'article',
            },
          ];
        }
        return [];
      },
    };
    const blog = { posts: [post] };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).not.toContain('related-links');
  });
});
