import { describe, test, expect } from '@jest/globals';
import { CSS_CLASSES } from '../../src/constants/markdown.js';

// Additional coverage to kill Stryker mutants around CSS_CLASSES values

describe('markdown constants mutants', () => {
  test('CSS_CLASSES object has expected values', () => {
    expect(CSS_CLASSES).toEqual({
      CONTAINER: 'markdown-container',
      HEADING: 'markdown-heading',
      PARAGRAPH: 'markdown-paragraph',
      LIST: 'markdown-list',
      LIST_ITEM: 'markdown-list-item',
      BLOCKQUOTE: 'markdown-blockquote',
      CODE: 'markdown-code',
      INLINE_CODE: 'markdown-inline-code',
      LINK: 'markdown-link',
      IMAGE: 'markdown-image',
      HORIZONTAL_RULE: 'markdown-hr',
    });
  });
});
