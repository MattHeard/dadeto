import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = html => html;

describe('MEDIA_CONTENT_CONFIG audio controls count', () => {
  test('audio controls attribute appears for each audio post', () => {
    const blog = {
      posts: [
        {
          key: 'A1',
          title: 'Audio1',
          publicationDate: '2024-06-01',
          audio: { fileType: 'mp3' },
        },
        {
          key: 'A2',
          title: 'Audio2',
          publicationDate: '2024-06-02',
          audio: { fileType: 'mp3' },
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const matches = html.match(/<audio[^>]*controls>/g) || [];
    expect(matches).toHaveLength(blog.posts.length);
  });
});
