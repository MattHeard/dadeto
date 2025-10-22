import { generateBlogOuter } from '../../src/build/generator.js';
import { describe, test, expect } from '@jest/globals';

describe('header generation without cache busting', () => {
  test('generateBlogOuter includes banner and metadata', () => {
    const html = generateBlogOuter({ posts: [] });
    expect(html).toContain('aria-label="Matt Heard"');
    expect(html).toContain('Software developer and philosopher in Berlin');
  });
});
