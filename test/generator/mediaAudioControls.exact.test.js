import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = html => html;

describe('MEDIA_CONTENT_CONFIG audio controls exact output', () => {
  test('audio section renders with controls attribute', () => {
    const blog = {
      posts: [
        {
          key: 'AEXACT',
          title: 'Audio Exact',
          publicationDate: '2024-05-01',
          audio: { fileType: 'mp3' },
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const expected =
      '<audio class="value" controls><source src="2024-05-01.mp3"></audio>';
    expect(html).toContain(expected);
  });
});
