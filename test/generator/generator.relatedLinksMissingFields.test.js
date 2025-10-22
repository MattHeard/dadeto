import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

const header = '<body>';
const footer = '</body>';
const wrap = content => ['<html>', content, '</html>'].join('');

describe('generateBlog missing related link fields', () => {
  test('renders related link with empty strings and no undefined values', () => {
    const blog = {
      posts: [
        {
          key: 'RL1',
          title: 'Link Post',
          publicationDate: '2024-01-01',
          content: ['text'],
          relatedLinks: [
            {
              url: 'https://example.com',
              type: 'article',
            },
          ],
        },
      ],
    };

    const html = generateBlog({ blog, header, footer }, wrap);
    expect(html).toContain('<div class="key">links</div>');
    expect(html).toContain(
      '<a href="https://example.com" target="_blank" rel="noopener">""</a>'
    );
    expect(html).not.toContain('undefined');
  });
});
