import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => c;

describe('MEDIA_CONTENT_CONFIG audio controls exact HTML', () => {
  test('audio section includes controls attribute with source', () => {
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
    expect(html).toContain(
      '<audio class="value" controls><source src="2024-06-02.mp3"></audio>'
    );
  });
});
