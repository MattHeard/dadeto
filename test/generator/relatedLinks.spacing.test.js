import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

const header = '<body>';
const footer = '</body>';
const wrap = content => ['<html>', content, '</html>'].join('');

describe('generateBlog related links spacing', () => {
  test('omits extra spaces when optional fields are missing', () => {
    const blog = {
      posts: [
        {
          key: 'SPC1',
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
    const match = html.match(/<li>(.*?)<\/li>/);
    expect(match).not.toBeNull();
    expect(match[0]).toBe(
      '<li><a href="https://example.com" target="_blank" rel="noopener">""</a></li>'
    );
  });
});
