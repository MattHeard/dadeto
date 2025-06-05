import { describe, test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/generator/generator.js';

describe('container closing tag', () => {
  test('generateBlogOuter closes container before script', () => {
    const html = generateBlogOuter({ posts: [] });
    expect(html).toContain(
      '</div></div></div><script type="module" src="browser/main.js" defer></script>'
    );
  });
});
