import { describe, test, expect } from '@jest/globals';
import { getBlogGenerationArgs } from '../../src/generator/generator.js';

describe('createSection integration', () => {
  test('header and footer sections include entry div', () => {
    const { header, footer } = getBlogGenerationArgs();
    expect(header).toContain('<div class="entry">');
    expect(footer).toContain('<div class="entry">');
  });
});
