import { beforeAll, describe, it, expect } from '@jest/globals';

let getBlogGenerationArgs;
let generateBlogOuter;

beforeAll(async () => {
  ({ getBlogGenerationArgs, generateBlogOuter } = await import(
    '../../src/generator/generator.js'
  ));
});

describe('generateBlogOuter', () => {
  it('returns a string of HTML when given a blog object with an empty posts array', () => {
    const result = generateBlogOuter({ posts: [] });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain('id="container"');
  });
});

describe('getBlogGenerationArgs', () => {
  it('returns an object with header, footer, and wrapFunc', () => {
    const result = getBlogGenerationArgs();
    expect(result).toHaveProperty('header');
    expect(result).toHaveProperty('footer');
    expect(result).toHaveProperty('wrapFunc');
    expect(typeof result.header).toBe('string');
    expect(typeof result.footer).toBe('string');
    expect(typeof result.wrapFunc).toBe('function');
    expect(result.header.length).toBeGreaterThan(0);
    expect(result.footer.length).toBeGreaterThan(0);
    expect(result.header).toContain('<div id="container">');
  });

  it('includes the banner and metadata in the header HTML', () => {
    const { header } = getBlogGenerationArgs();
    expect(header).toContain('aria-label="Matt Heard"');
    expect(header).toContain('Software developer and philosopher in Berlin');
  });

  it('includes the container element in the header HTML', () => {
    const { header } = getBlogGenerationArgs();
    expect(header).toContain('<div id="container">');
  });

  it('includes the opening body tag in the header HTML', () => {
    const { header } = getBlogGenerationArgs();
    expect(header).toContain('<body>');
  });

  it('includes the copyright warning message in the footer HTML', () => {
    const { footer } = getBlogGenerationArgs();
    expect(footer).toContain('All content is authored by Matt Heard and is');
  });

  it('includes the footer classes in the footer HTML', () => {
    const { footer } = getBlogGenerationArgs();
    expect(footer).toContain('class="footer value warning"');
    expect(footer).not.toContain('undefined');
  });

  it('generates header content when imported inside the test', async () => {
    const { getBlogGenerationArgs } = await import(
      '../../src/generator/generator.js'
    );
    const { header } = getBlogGenerationArgs();
    expect(header).toContain('aria-label="Matt Heard"');
    expect(header).toContain('Software developer and philosopher in Berlin');
  });
});
