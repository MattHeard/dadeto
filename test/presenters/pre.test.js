import { describe, test, expect } from '@jest/globals';
import { createPreElement } from '../../src/presenters/pre.js';

// Simple mock DOM abstraction
function createMockDom() {
  return {
    createdElements: [],
    createElement(tag) {
      const el = { tagName: tag, textContent: '' };
      this.createdElements.push(el);
      return el;
    },
    setTextContent(el, text) {
      el.textContent = text;
    }
  };
}

describe('createPreElement', () => {
  test.each([
    ['some\npre-formatted\ntext', 'some\npre-formatted\ntext'],
    ['[a, b, c]', 'a\nb\nc'],
    ['[]', ''],
    ['[  x,   y  ,z ]', 'x\ny\nz'],
    ['[single]', 'single'],
    ['', ''],
  ])('given %p when creating the element then it sets %p as text', (input, expected) => {
    // Given
    const dom = createMockDom();

    // When
    const pre = createPreElement(input, dom);

    // Then
    expect(pre.tagName).toBe('pre');
    expect(pre.textContent).toBe(expected);
    // Ensure the element is tracked in the mock DOM
    expect(dom.createdElements).toContain(pre);
  });
});
