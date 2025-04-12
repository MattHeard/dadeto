// paragraph.test.js
import { describe, it, jest, expect } from '@jest/globals';
import { createParagraphElement } from '../../src/presenters/paragraph';

describe('createParagraphElement', () => {
  it('creates a <p> element with the correct text content', () => {
    const mockElement = {};
    const dom = {
      createElement: jest.fn().mockReturnValue(mockElement),
      setTextContent: jest.fn()
    };

    const result = createParagraphElement('Hello world', dom);

    expect(dom.createElement).toHaveBeenCalledWith('p');
    expect(dom.setTextContent).toHaveBeenCalledWith(mockElement, 'Hello world');
    expect(result).toBe(mockElement);
  });

  it('works with different input strings', () => {
    const mockElement = {};
    const dom = {
      createElement: jest.fn().mockReturnValue(mockElement),
      setTextContent: jest.fn()
    };

    const result = createParagraphElement('Another test string', dom);

    expect(dom.setTextContent).toHaveBeenCalledWith(mockElement, 'Another test string');
    expect(result).toBe(mockElement);
  });
});