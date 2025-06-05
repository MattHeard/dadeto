import { describe, test, expect } from '@jest/globals';

describe('header section generation', () => {
  test('generateBlogOuter includes banner and metadata when importing normally', async () => {
    const { generateBlogOuter } = await import('../../src/generator/generator.js');
    const html = generateBlogOuter({ posts: [] });
    expect(html).toContain('aria-label="Matt Heard"');
    expect(html).toContain('Software developer and philosopher in Berlin');
  });
});
