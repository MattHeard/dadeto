import { describe, test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/generator/generator.js';

describe('footer warning message count', () => {
  test('warning message appears exactly once', () => {
    const html = generateBlogOuter({ posts: [] });
    const matches = html.match(/All content is authored[^<]*/g) || [];
    expect(matches).toHaveLength(1);
  });
});
