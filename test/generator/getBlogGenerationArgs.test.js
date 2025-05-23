import { getBlogGenerationArgs, generateBlogOuter } from '../../src/generator/generator.js';

describe('generateBlogOuter', () => {
  it('returns a string of HTML when given a blog object with an empty posts array', () => {
    const result = generateBlogOuter({ posts: [] });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
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
  });
});

