import { describe, test, expect } from '@jest/globals';
import { getBlogGenerationArgs } from '../../src/build/generator.js';

describe('footer start', () => {
  test('getBlogGenerationArgs footer starts with entry div', () => {
    const { footer } = getBlogGenerationArgs();
    expect(footer.startsWith('<div class="entry">')).toBe(true);
  });
});
