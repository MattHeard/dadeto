import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = content => ['<html>', content, '</html>'].join('');

describe('MEDIA_CONFIG labels', () => {
  test('generateBlog uses expected labels for media sections', () => {
    const blog = {
      posts: [
        {
          key: 'MEDIA',
          title: 'Media Labels',
          publicationDate: '2024-01-01',
          illustration: { fileType: 'png', altText: 'Alt' },
          audio: { fileType: 'mp3' },
          youtube: { id: 'abc', timestamp: 0, title: 'Video' },
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<div class="key media">illus</div>');
    expect(html).toContain('<div class="key media">audio</div>');
    expect(html).toContain('<div class="key media">video</div>');

    // Verify media sections render expected HTML elements
    expect(html).toContain('<img');
    expect(html).toContain('<audio');
    expect(html).toContain('<iframe');
  });
});
