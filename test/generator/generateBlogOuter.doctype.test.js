import { describe, test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/build/generator.js';

// Ensure generateBlogOuter includes the DOCTYPE declaration at the start

describe('generateBlogOuter DOCTYPE', () => {
  test('prepends DOCTYPE to generated HTML', () => {
    const html = generateBlogOuter({ posts: [] });
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
  });
});
