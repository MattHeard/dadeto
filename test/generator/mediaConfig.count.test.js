import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => ['<html>', c, '</html>'].join('');

describe('MEDIA_CONFIG completeness', () => {
  test('generateBlog outputs labels for all media types', () => {
    const blog = {
      posts: [
        {
          key: 'ALLMEDIA',
          title: 'All Media',
          publicationDate: '2024-06-01',
          illustration: { fileType: 'png', altText: 'Alt' },
          audio: { fileType: 'mp3' },
          youtube: { id: 'abc', timestamp: 0, title: 'Video' },
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const matches = html.match(/<div class="key media">[^<]+<\/div>/g);
    expect(matches).toEqual([
      '<div class="key media">illus</div>',
      '<div class="key media">audio</div>',
      '<div class="key media">video</div>',
    ]);
  });
});
