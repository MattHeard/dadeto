// paragraph.test.js
import { describe, test, expect } from '@jest/globals';
import { createParagraphElement } from '../../src/presenters/paragraph.js';

/**
 * Creates a mock DOM object for testing.
 * @returns {object} mock DOM implementation
 */
function createMockDom() {
  const element = { textContent: '' };
  return {
    element,
    createElement: () => element,
    setTextContent: (el, text) => {
      el.textContent = text;
    },
  };
}

describe('createParagraphElement', () => {
  test.each(['Hello world', 'Another test string'])(
    'given %p when creating the element then the text is set',
    input => {
      // Given
      const dom = createMockDom();

      // When
      const result = createParagraphElement(input, dom);

      // Then
      expect(result).toBe(dom.element);
      expect(result.textContent).toBe(input);
    }
  );
});
