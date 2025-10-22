import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => ['<html>', c, '</html>'].join('');

describe('MEDIA_CONTENT_CONFIG audio controls', () => {
  test('audio elements include the controls attribute', () => {
    const blog = {
      posts: [
        {
          key: 'AUDCTRL',
          title: 'Audio Controls',
          publicationDate: '2024-06-02',
          audio: { fileType: 'mp3' },
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<audio class="value" controls>');
  });
});
