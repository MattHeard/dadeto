import { beforeAll, describe, it, expect } from '@jest/globals';

let generateBlogOuter;

beforeAll(async () => {
  ({ generateBlogOuter } = await import('../../src/generator/generator.js'));
});

describe('footer section', () => {
  it('renders empty key div', () => {
    const html = generateBlogOuter({ posts: [] });
    expect(html).toContain(
      '<div class="key"></div><div class="footer value warning">'
    );
  });
});
