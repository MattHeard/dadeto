import { describe, test, expect } from '@jest/globals';
import { getBlogGenerationArgs } from '../../src/build/generator.js';

describe('header content key divs', () => {
  test('getBlogGenerationArgs header has two empty key divs', () => {
    const { header } = getBlogGenerationArgs();
    const matches = header.match(/<div class="key"><\/div>/g) || [];
    expect(matches.length).toBe(2);
  });
});
