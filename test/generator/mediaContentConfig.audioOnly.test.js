import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => ['<html>', c, '</html>'].join('');

describe('MEDIA_CONTENT_CONFIG single audio', () => {
  test('generateBlog only outputs audio section when only audio present', () => {
    const blog = {
      posts: [
        {
          key: 'AUDONLY',
          title: 'Audio Only',
          publicationDate: '2024-06-02',
          audio: { fileType: 'mp3' },
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<audio');
    // Ensure the audio tag includes the controls attribute
    expect(html).toContain('<audio class="value" controls>');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<iframe');
  });
});
