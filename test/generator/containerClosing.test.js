import { describe, test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/generator/generator.js';

describe('container closing', () => {
  test('generateBlogOuter closes container before script tag', () => {
    const html = generateBlogOuter({ posts: [] });
    expect(html.includes('</div></div><script')).toBe(true);
  });
});
