import { describe, test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/build/generator.js';

describe('media sections mutant', () => {
  test('blog html should not contain undefined when media present', () => {
    const blog = {
      posts: [
        {
          key: 'VIDE1',
          title: 'Video Post',
          publicationDate: '2024-01-01',
          youtube: { id: 'abc123', timestamp: 0, title: 'Example' },
        },
      ],
    };
    const html = generateBlogOuter(blog);
    expect(html.includes('undefined')).toBe(false);
    expect(html).toContain('<iframe');
  });

  test('blog html includes labeled sections for all media types', () => {
    const blog = {
      posts: [
        {
          key: 'ALLMEDIA',
          title: 'All Media',
          publicationDate: '2024-01-01',
          illustration: { fileType: 'png', altText: 'Alt' },
          audio: { fileType: 'mp3' },
          youtube: { id: 'abc', timestamp: 0, title: 'Video' },
        },
      ],
    };
    const html = generateBlogOuter(blog);
    expect(html).toContain('<div class="key media">illus</div>');
    expect(html).toContain('<div class="key media">audio</div>');
    expect(html).toContain('<div class="key media">video</div>');
    expect(html).toContain('<img');
    expect(html).toContain('<audio');
    expect(html).toContain('<iframe');
  });
});
