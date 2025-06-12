import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => c;

describe('MEDIA_SECTIONS mapping', () => {
  test('generateBlog includes sections for all media types', () => {
    const blog = {
      posts: [
        {
          key: 'MEDIA1',
          title: 'Media Example',
          publicationDate: '2024-01-01',
          illustration: { fileType: 'png', altText: 'image' },
          audio: { fileType: 'mp3' },
          youtube: { id: 'id', timestamp: 0, title: 'video' },
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<div class="key media">illus</div>');
    expect(html).toContain('<div class="key media">audio</div>');
    expect(html).toContain('<div class="key media">video</div>');
  });
});
