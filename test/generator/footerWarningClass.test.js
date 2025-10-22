import { test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/build/generator.js';

test('footer warning class appears exactly once', () => {
  const html = generateBlogOuter({ posts: [] });
  const matches = html.match(/<div class="footer value warning">/g) || [];
  expect(matches.length).toBe(1);
});
