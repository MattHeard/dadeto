import { describe, test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/generator/generator.js';

describe('footer script tag', () => {
  test('generateBlogOuter includes main script tag', () => {
    const html = generateBlogOuter({ posts: [] });
    expect(html).toContain(
      '<script type="module" src="browser/main.js" defer></script>'
    );
  });

  test('container is closed before the main script tag', () => {
    const html = generateBlogOuter({ posts: [] });
    expect(html).toContain(
      '</div><script type="module" src="browser/main.js" defer></script>'
    );
  });

  test('generateBlogOuter closes the container before the script tag', () => {
    const html = generateBlogOuter({ posts: [] });
    expect(html).toContain(
      '</div></div><script type="module" src="browser/main.js" defer></script>'
    );
  });
});
