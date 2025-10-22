import { describe, test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/build/generator.js';

describe('footer warning message', () => {
  test('generateBlogOuter includes copyright notice', () => {
    const html = generateBlogOuter({ posts: [] });
    expect(html).toContain(
      'All content is authored by Matt Heard and is <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>, unless otherwise noted.'
    );
  });
});
