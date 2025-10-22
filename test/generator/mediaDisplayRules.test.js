import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => ['<html>', c, '</html>'].join('');

describe('MEDIA_DISPLAY_RULES integration', () => {
  test('generateBlog omits media sections when post has none', () => {
    const blog = {
      posts: [
        { key: 'NONE1', title: 'No Media', publicationDate: '2024-06-01' },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<audio');
    expect(html).not.toContain('<iframe');
  });

  test('generateBlog includes media sections when post has media', () => {
    const blog = {
      posts: [
        {
          key: 'MEDIA1',
          title: 'With Media',
          publicationDate: '2024-06-01',
          illustration: { fileName: 'img', fileType: 'png', altText: 'alt' },
          audio: { fileType: 'mp3' },
          youtube: { id: 'vid', timestamp: 0, title: 'Video' },
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<img');
    expect(html).toContain('<audio');
    expect(html).toContain('<iframe');
    // Ensure media sections include the correct key class
    expect(html).toContain('class="key media"');
  });

  test('generateBlog includes only audio section when post has only audio', () => {
    const blog = {
      posts: [
        {
          key: 'AUDIO1',
          title: 'Audio Only',
          publicationDate: '2024-06-01',
          audio: { fileType: 'mp3' },
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<audio');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<iframe');
  });
});
