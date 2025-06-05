import { describe, test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/generator/generator.js';

describe('generator mutants', () => {
  test('output does not contain mutation marker', () => {
    const html = generateBlogOuter({ posts: [] });
    expect(html.includes('Stryker was here!')).toBe(false);
  });
});
