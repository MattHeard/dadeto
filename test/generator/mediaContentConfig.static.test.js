import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => ['<html>', c, '</html>'].join('');

describe('MEDIA_CONTENT_CONFIG via generateBlog', () => {
  test('generates media sections for youtube, audio and illustration', () => {
    const blog = {
      posts: [
        {
          key: 'YT01',
          title: 'Video',
          publicationDate: '2024-01-01',
          youtube: { id: 'abc123', timestamp: 0, title: 'Example' },
        },
        {
          key: 'AU01',
          title: 'Audio',
          publicationDate: '2024-01-02',
          audio: { fileType: 'mp3' },
        },
        {
          key: 'IMG1',
          title: 'Image',
          publicationDate: '2024-01-03',
          illustration: { fileType: 'png', altText: 'Alt' },
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<iframe');
    expect(html).toContain('<audio');
    expect(html).toContain('<img');
  });
});
