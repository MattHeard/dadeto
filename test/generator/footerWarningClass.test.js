import { describe, it, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/generator/generator.js';

describe('footer warning class', () => {
  it('includes the warning CSS class on the footer value div', () => {
    const html = generateBlogOuter({ posts: [] });
    const regex = /<div class="footer value warning">/;
    expect(html).toMatch(regex);
  });
});
