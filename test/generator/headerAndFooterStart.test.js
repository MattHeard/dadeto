import { describe, test, expect } from '@jest/globals';
import { getBlogGenerationArgs } from '../../src/build/generator.js';

describe('entry class usage', () => {
  test('header and footer include entry class', () => {
    const { header, footer } = getBlogGenerationArgs();
    expect(header.includes('<div class="entry">')).toBe(true);
    expect(footer.startsWith('<div class="entry">')).toBe(true);
  });
});
