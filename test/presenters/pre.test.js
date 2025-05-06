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

  test('renders comma-separated list inside brackets on separate lines', () => {
    const dom = createMockDom();
    const input = '[a, b, c]';
    const pre = createPreElement(input, dom);
    expect(pre.tagName).toBe('pre');
    expect(pre.textContent).toBe('a\nb\nc');
  });

  test('renders empty string for empty brackets', () => {
    const dom = createMockDom();
    const input = '[]';
    const pre = createPreElement(input, dom);
    expect(pre.tagName).toBe('pre');
    expect(pre.textContent).toBe('');
  });

  test('trims whitespace for each element', () => {
    const dom = createMockDom();
    const input = '[  x,   y  ,z ]';
    const pre = createPreElement(input, dom);
    expect(pre.textContent).toBe('x\ny\nz');
  });

  test('does not split if only one element in brackets', () => {
    const dom = createMockDom();
    const input = '[single]';
    const pre = createPreElement(input, dom);
    expect(pre.textContent).toBe('single');
  });

  test('handles empty string', () => {
    const dom = createMockDom();
    const pre = createPreElement('', dom);
    expect(pre.tagName).toBe('pre');
    expect(pre.textContent).toBe('');
  });
});
