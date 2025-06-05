import { generateBlogOuter } from '../../src/generator/generator.js';
import { describe, test, expect } from '@jest/globals';

describe('container closing div', () => {
  test('generateBlogOuter closes container before script tag', () => {
    const html = generateBlogOuter({ posts: [] });
    const snippet =
      '</div><script type="module" src="browser/main.js" defer></script>';
    expect(html).toContain(snippet);
  });
});
