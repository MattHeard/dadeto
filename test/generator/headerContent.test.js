import { describe, test, expect } from '@jest/globals';

// Dynamically import generator functions within the test to ensure coverage

describe('header content generation', () => {
  test('header includes banner and metadata text', async () => {
    const { getBlogGenerationArgs } = await import('../../src/generator/generator.js');
    const { header } = getBlogGenerationArgs();
    expect(header).toContain('aria-label="Matt Heard"');
    expect(header).toContain('Software developer and philosopher in Berlin');
  });
});
