import { describe, test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/generator/generator.js';

describe('footer script tag', () => {
  test('generateBlogOuter includes main script tag', () => {
    const html = generateBlogOuter({ posts: [] });
    expect(html).toContain('<script type="module" src="browser/main.js" defer></script>');
  });

  test('generateBlogOuter closes container before script tag', () => {
    const html = generateBlogOuter({ posts: [] });
    const closingDivs = html.match(/<\/div>/g) || [];
    expect(closingDivs.length).toBe(9);
    expect(html).toContain('</div><script type="module" src="browser/main.js" defer></script>');
  });
});
