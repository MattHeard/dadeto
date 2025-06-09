import { test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => c;

test('DEFAULT_RELATED_LINK_ATTRS anchor exact match', () => {
  const blog = {
    posts: [
      {
        key: 'EXACT',
        title: 'Exact',
        publicationDate: '2024-01-01',
        content: ['x'],
        relatedLinks: [
          { url: 'https://exact.com', type: 'article', title: 'Exact' },
        ],
      },
    ],
  };
  const html = generateBlog({ blog, header, footer }, wrapHtml);
  expect(html).toContain(
    '<a href="https://exact.com" target="_blank" rel="noopener">"Exact"</a>'
  );
});
