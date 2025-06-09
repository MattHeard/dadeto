import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => c;

describe('MEDIA_CONTENT_CONFIG audio controls attribute', () => {
  test('audio tag includes controls attribute', () => {
    const blog = {
      posts: [
        {
          key: 'ACTRL',
          title: 'Audio Controls',
          publicationDate: '2024-05-01',
          audio: { fileType: 'mp3' },
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const match = html.match(/<audio[^>]*>/);
    expect(match).not.toBeNull();
    expect(match[0]).toContain('controls');
  });
});
