import { describe, test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/build/generator.js';

describe('footer warning message position', () => {
  test('warning message is inside footer value div', () => {
    const html = generateBlogOuter({ posts: [] });
    const expected =
      '<div class="key"></div><div class="footer value warning">' +
      'All content is authored by Matt Heard';
    expect(html.includes(expected)).toBe(true);
  });
});
