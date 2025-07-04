import { describe, it, expect, jest } from '@jest/globals';

describe('header generation instrumented import', () => {
  it('includes metadata in the generated blog HTML', async () => {
    jest.resetModules();
    const { generateBlogOuter } = await import(
      '../../src/generator/generator.js'
    );
    const html = generateBlogOuter({ posts: [] });
    expect(html).toContain('Software developer and philosopher in Berlin');
  });
});
