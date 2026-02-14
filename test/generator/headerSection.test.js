import { describe, test, expect } from '@jest/globals';

describe('header section generation', () => {
  test('generateBlogOuter includes banner and metadata when importing normally', async () => {
    const { generateBlogOuter } = await import('../../src/build/generator.js');
    const html = generateBlogOuter({ posts: [] });
    expect(html).toContain('aria-label="Matt Heard"');
    expect(html).toContain('Software developer and philosopher in Berlin');
  });

  test('header labeled sections have empty keys except nav and links', async () => {
    const { getBlogGenerationArgs } = await import(
      '../../src/build/generator.js'
    );
    const { header } = getBlogGenerationArgs();
    const keyMatches = [...header.matchAll(/<div class="key">([^<]*)<\/div>/g)];
    expect(keyMatches).toHaveLength(4);
    keyMatches.forEach(([, text]) => {
      // nav and links keys contain text, others are empty
      if (text !== 'nav' && text !== 'links') {
        expect(text).toBe('');
      }
    });
  });

  test('header joins parts without unexpected separators', async () => {
    const { getBlogGenerationArgs } = await import(
      '../../src/build/generator.js'
    );
    const { header } = getBlogGenerationArgs();
    expect(header.includes('Stryker was here!')).toBe(false);
  });
});
