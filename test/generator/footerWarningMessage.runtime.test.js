import { test, expect } from '@jest/globals';

let generateBlogOuter;

test('generateBlogOuter includes the warning message when imported at runtime', async () => {
  ({ generateBlogOuter } = await import('../../src/generator/generator.js'));
  const html = generateBlogOuter({ posts: [] });
  const msg =
    'All content is authored by Matt Heard and is <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>, unless otherwise noted.';
  expect(html).toContain(msg);
});
