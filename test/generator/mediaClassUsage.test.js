import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => ['<html>', c, '</html>'].join('');

describe('CLASS.MEDIA usage', () => {
  test('youtube media section uses media key class', () => {
    const blog = {
      posts: [
        {
          key: 'VID1',
          title: 'Video Post',
          publicationDate: '2024-01-01',
          youtube: { id: 'abc', timestamp: 0, title: 'Video' },
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<div class="key media">video</div>');
  });
});
