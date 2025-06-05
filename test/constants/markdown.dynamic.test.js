import { describe, test, expect, jest } from '@jest/globals';

/**
 * Dynamic import tests to ensure constants survive module cache resets.
 */
describe('markdown constants isolated', () => {
  test('HTML_TAGS values via dynamic import', async () => {
    jest.resetModules();
    const module = await import('../../src/constants/markdown.js');
    const { HTML_TAGS, CSS_CLASSES } = module;
    expect(HTML_TAGS.LIST).toBe('ul');
    expect(HTML_TAGS.LIST_ITEM).toBe('li');
    expect(HTML_TAGS.HORIZONTAL_RULE).toBe('hr');
    expect(CSS_CLASSES.LIST_ITEM).toBe('markdown-list-item');
  });

  test('CSS_CLASSES values via dynamic import', async () => {
    jest.resetModules();
    const module = await import('../../src/constants/markdown.js');
    const { CSS_CLASSES } = module;
    expect(CSS_CLASSES.LIST).toBe('markdown-list');
    expect(CSS_CLASSES.LIST_ITEM).toBe('markdown-list-item');
    expect(CSS_CLASSES.BLOCKQUOTE).toBe('markdown-blockquote');
    expect(CSS_CLASSES.CODE).toBe('markdown-code');
    expect(CSS_CLASSES.INLINE_CODE).toBe('markdown-inline-code');
    expect(CSS_CLASSES.IMAGE).toBe('markdown-image');
  });
});
