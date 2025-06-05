import { describe, test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/generator/generator.js';

describe('footer closing div', () => {
  test('generateBlogOuter closes container div', () => {
    const html = generateBlogOuter({ posts: [] });
    expect(html).toContain(
      '</div><script type="module" src="browser/main.js" defer></script>'
    );
  });
});
