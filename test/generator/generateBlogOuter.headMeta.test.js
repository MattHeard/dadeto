import { describe, test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/build/generator.js';

describe('generateBlogOuter head meta tags', () => {
  test('generated HTML includes essential head metadata', () => {
    const html = generateBlogOuter({ posts: [] });
    expect(html).toContain('<meta charset="UTF-8">');
    expect(html).toContain('<link rel="manifest" href="/site.webmanifest">');
  });
});
