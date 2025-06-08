import { describe, test, expect } from '@jest/globals';
import { getBlogGenerationArgs } from '../../src/generator/generator.js';

describe('getBlogGenerationArgs head contents', () => {
  test('header includes head meta tags', () => {
    const { header } = getBlogGenerationArgs();
    expect(header).toContain('<meta charset="UTF-8">');
    expect(header).toContain('<link rel="manifest" href="/site.webmanifest">');
  });
});
