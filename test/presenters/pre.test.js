import { describe, test, expect, jest } from '@jest/globals';
import { createPreElement } from '../../src/presenters/pre.js';

// Simple mock DOM abstraction
/**
 * Creates a lightweight DOM used for testing.
 * @returns {object} mock DOM interface
 */
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
    },
  };
}

describe('createPreElement', () => {
  test.each([
    ['some\npre-formatted\ntext', 'some\npre-formatted\ntext'],
    ['[a, b, c]', 'a\nb\nc'],
    ['[]', ''],
    ['[   ]', ''],
    ['[  x,   y  ,z ]', 'x\ny\nz'],
    ['[single]', 'single'],
    ['', ''],
    ['[a', '[a'],
    ['a]', 'a]'],
    [42, 42],
  ])(
    'given %p when creating the element then it sets %p as text',
    (input, expected) => {
      // Given
      const dom = createMockDom();

      // When
      const pre = createPreElement(input, dom);

      // Then
      expect(pre.tagName).toBe('pre');
      expect(pre.textContent).toBe(expected);
      // Ensure the element is tracked in the mock DOM
      expect(dom.createdElements).toContain(pre);
    }
  );

  test('given empty bracket list then split is not called', () => {
    const dom = createMockDom();
    const spy = jest.spyOn(String.prototype, 'split');
    createPreElement('[]', dom);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test('given whitespace only bracket list then split is not called', () => {
    const dom = createMockDom();
    const spy = jest.spyOn(String.prototype, 'split');
    createPreElement('[   ]', dom);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test('given populated bracket list then split is called', () => {
    const dom = createMockDom();
    const spy = jest.spyOn(String.prototype, 'split');
    createPreElement('[a,b]', dom);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
