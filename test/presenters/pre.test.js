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
  test('creates a <pre> element with the correct text content', () => {
    const dom = createMockDom();
    const input = 'some\npre-formatted\ntext';
    const pre = createPreElement(input, dom);
    expect(pre.tagName).toBe('pre');
    expect(pre.textContent).toBe(input);
    // Ensure the element is tracked in the mock DOM
    expect(dom.createdElements).toContain(pre);
  });

  test('handles empty string', () => {
    const dom = createMockDom();
    const pre = createPreElement('', dom);
    expect(pre.tagName).toBe('pre');
    expect(pre.textContent).toBe('');
  });
});
