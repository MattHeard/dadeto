import { describe, test, expect } from '@jest/globals';

// Dynamically import within test to ensure mutant coverage

async function getGenerator() {
  return await import('../../src/generator/generator.js');
}

describe('media sections dynamic import', () => {
  test('blog with all media types renders each section', async () => {
    const { generateBlogOuter } = await getGenerator();
    const blog = {
      posts: [
        {
          key: 'DYN1',
          title: 'Dynamic Media',
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
