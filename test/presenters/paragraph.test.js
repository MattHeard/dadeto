// paragraph.test.js
import { describe, it, expect } from '@jest/globals';
import { createParagraphElement } from '../../src/presenters/paragraph';

describe('createParagraphElement', () => {
  it('creates a <p> element with the correct text content', () => {
    const mockElement = { textContent: '' };
    const dom = {
      createElement: () => mockElement,
      setTextContent: (el, text) => { el.textContent = text; }
    };

    const result = createParagraphElement('Hello world', dom);

    expect(result).toBe(mockElement);
    expect(result.textContent).toBe('Hello world');
  });

  it('works with different input strings', () => {
    const mockElement = { textContent: '' };
    const dom = {
      createElement: () => mockElement,
      setTextContent: (el, text) => { el.textContent = text; }
    };

    const result = createParagraphElement('Another test string', dom);

    expect(result.textContent).toBe('Another test string');
  });
});