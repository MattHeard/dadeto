import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => ['<html>', c, '</html>'].join('');

describe('DEFAULT_RELATED_LINK_ATTRS reloaded module', () => {
  test('anchors contain default attributes', () => {
    const blog = {
      posts: [
        {
          key: 'RLRE',
          title: 'Reload Test',
          publicationDate: '2024-01-01',
          content: ['a'],
          relatedLinks: [
            { url: 'https://reloaded.com', type: 'article', title: 'R' },
          ],
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('target="_blank" rel="noopener"');
  });
});
