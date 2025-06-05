import { describe, test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/generator/generator.js';

describe('generator constants usage', () => {
  test('blog output includes container id and footer classes', () => {
    const html = generateBlogOuter({ posts: [] });
    expect(html).toContain('id="container"');
    expect(html).toContain('class="footer value warning"');
    expect(html).toContain('All content is authored by Matt Heard');
    expect(html).toContain('Software developer and philosopher in Berlin');
  });

  test('blog output contains the body tags', () => {
    const html = generateBlogOuter({ posts: [] });
    expect(html).toContain('<body>');
    expect(html).toContain('</body>');
  });
});
