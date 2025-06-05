import { describe, test, expect } from '@jest/globals';

describe('header section generation', () => {
  test('generateBlogOuter includes banner and metadata when importing normally', async () => {
    const { generateBlogOuter } = await import(
      '../../src/generator/generator.js'
    );
    const html = generateBlogOuter({ posts: [] });
    expect(html).toContain('aria-label="Matt Heard"');
    expect(html).toContain('Software developer and philosopher in Berlin');
  });

  test('header key divs are empty', async () => {
    const { getBlogGenerationArgs } = await import(
      '../../src/generator/generator.js'
    );
    const { header } = getBlogGenerationArgs();
    const matches = header.match(/<div class="key">(.*?)<\/div>/g);
    expect(matches?.length).toBeGreaterThan(0);
    for (const keyDiv of matches) {
      expect(keyDiv).toBe('<div class="key"></div>');
    }
  });
});
