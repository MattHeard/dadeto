import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = content => ['<html>', content, '</html>'].join('');

const cases = [
  ['Example', 'https://example.com', 'Example'],
  ['Exact', 'https://exact.com', 'Exact'],
  ['Reload Test', 'https://reloaded.com', 'R'],
  ['Single', 'https://one.com', 'One'],
];

describe('DEFAULT_RELATED_LINK_ATTRS usage', () => {
  test.each(cases)(
    'anchors contain default attributes for %s',
    (title, url, linkTitle) => {
      const blog = {
        posts: [
          {
            key: title.toUpperCase().replace(/ /g, ''),
            title,
            publicationDate: '2024-01-01',
            content: ['Test'],
            relatedLinks: [{ url, type: 'article', title: linkTitle }],
          },
        ],
      };

      const html = generateBlog({ blog, header, footer }, wrapHtml);
      const expected = `<a href="${url}" target="_blank" rel="noopener">"${linkTitle}"</a>`;
      expect(html).toContain(expected);
      const matches = html.match(/target="_blank" rel="noopener"/g) || [];
      expect(matches).toHaveLength(1);
    }
  );
});
