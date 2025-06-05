import { describe, test, expect, beforeAll } from '@jest/globals';

let generateBlogOuter;

beforeAll(async () => {
  ({ generateBlogOuter } = await import('../../src/generator/generator.js'));
});

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

  test('container div closes before the footer script', () => {
    const html = generateBlogOuter({ posts: [] });
    const regex =
      /<\/div><\/div><\/div><script type="module" src="browser\/main.js" defer><\/script>/;
    expect(html).toMatch(regex);
  });

  test('footer content is not wrapped in an extra value div', () => {
    const html = generateBlogOuter({ posts: [] });
    expect(html.includes('<div class="value"><div class="footer')).toBe(false);
  });

  test('header content is not wrapped in an extra value div', () => {
    const html = generateBlogOuter({ posts: [] });
    expect(html.includes('<div class="value"><div class="value')).toBe(false);
  });

  test('header key divs are empty', () => {
    const html = generateBlogOuter({ posts: [] });
    const keyDivs = [...html.matchAll(/<div class="key">([^<]*)<\/div>/g)];
    expect(keyDivs.length).toBeGreaterThan(0);
    keyDivs.forEach(([, content]) => {
      expect(content).toBe('');
    });
  });

  test('blog output closes container before script tag', () => {
    const html = generateBlogOuter({ posts: [] });
    expect(html).toContain(
      '</div><script type="module" src="browser/main.js" defer></script>'
    );
  });
});
