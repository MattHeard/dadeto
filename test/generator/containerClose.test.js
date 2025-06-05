import { describe, test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/generator/generator.js';

describe('container closing div', () => {
  test('generateBlogOuter closes container before script tag', () => {
    const html = generateBlogOuter({ posts: [] });
    expect(html).toContain('</div><script type="module" src="browser/main.js" defer></script>');
    expect(html).not.toContain('undefined');
  });
});
