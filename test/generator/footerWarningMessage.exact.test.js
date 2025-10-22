import { describe, test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/build/generator.js';

describe('footer warning message exact text', () => {
  test('generateBlogOuter includes the full warning message exactly once', () => {
    const html = generateBlogOuter({ posts: [] });
    const msg =
      'All content is authored by Matt Heard and is <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>, unless otherwise noted.';
    const matches = html.match(new RegExp(msg, 'g')) || [];
    expect(matches).toHaveLength(1);
  });
});
