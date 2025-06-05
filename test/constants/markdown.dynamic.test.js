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
});
