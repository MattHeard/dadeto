import { describe, test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/generator/generator.js';

describe('footer warning message anchor link', () => {
  test('includes copyright anchor exactly once', () => {
    const html = generateBlogOuter({ posts: [] });
    const anchor =
      '<a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>';
    const matches = html.match(new RegExp(anchor, 'g')) || [];
    expect(matches).toHaveLength(1);
  });
});
