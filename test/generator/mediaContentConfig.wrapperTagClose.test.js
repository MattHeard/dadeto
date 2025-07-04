import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => ['<html>', c, '</html>'].join('');

describe('MEDIA_CONTENT_CONFIG wrapper tag', () => {
  test('illustration section uses div wrapper', () => {
    const blog = {
      posts: [
        {
          key: 'ILLW1',
          title: 'With Illustration',
          publicationDate: '2024-01-01',
          illustration: { fileType: 'png', altText: 'alt' },
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const match = html.match(/<div class="value"><img[^]*?<\/div>/);
    expect(match).not.toBeNull();
  });
});
