import { test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => c;

test('DEFAULT_RELATED_LINK_ATTRS applied to single related link', () => {
  const blog = {
    posts: [
      {
        key: 'SINGLE',
        title: 'Single',
        publicationDate: '2025-06-10',
        content: ['one'],
        relatedLinks: [
          { url: 'https://one.com', type: 'article', title: 'One' },
        ],
      },
    ],
  };
  const html = generateBlog({ blog, header, footer }, wrapHtml);
  const expected =
    '<a href="https://one.com" target="_blank" rel="noopener">"One"</a>';
  expect(html).toContain(expected);
  const matches = html.match(/target="_blank" rel="noopener"/g) || [];
  expect(matches).toHaveLength(1);
});
