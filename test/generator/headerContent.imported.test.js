import { describe, test, expect } from '@jest/globals';

describe('generator header dynamic import', () => {
  test('header includes banner, metadata and container', async () => {
    const { getBlogGenerationArgs } = await import(
      '../../src/build/generator.js'
    );
    const { header } = getBlogGenerationArgs();
    expect(header).toContain('aria-label="Matt Heard"');
    expect(header).toContain('Software developer and philosopher in Berlin');
    expect(header).toContain('<div id="container">');
    expect(header).toContain('class="value metadata"');
  });
});
