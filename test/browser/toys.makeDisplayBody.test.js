import { describe, it, expect, jest } from '@jest/globals';
import { makeDisplayBody } from '../../src/browser/toys.js';

describe('makeDisplayBody', () => {
  it('should return a function when called with required arguments', () => {
    // Arrange
    const mockDom = {
      removeAllChildren: () => {},
      appendChild: () => {},
      createElement: () => ({}), // Return empty object as mock element
      setTextContent: () => {}
    };
    const mockParent = {};
    const presenterKey = 'text';

    // Act
    const result = makeDisplayBody(mockDom, mockParent, presenterKey);
    const testBody = 'test content';

    // Act & Assert - Invoke the result with a test body
    expect(() => result(testBody)).not.toThrow();
  });

  it('appends element from presenter with correct text', () => {
    const removeAllChildren = jest.fn();
    const appendChild = jest.fn();
    const createElement = jest.fn(tag => ({ tagName: tag.toUpperCase(), textContent: '' }));
    const setTextContent = jest.fn((el, text) => {
      el.textContent = text;
    });
    const dom = { removeAllChildren, appendChild, createElement, setTextContent };
    const parent = {};
    const presenterKey = 'text';

    const displayBody = makeDisplayBody(dom, parent, presenterKey);
    const body = 'hello';
    displayBody(body);

    const [elementArg, textArg] = setTextContent.mock.calls[0];

    expect(removeAllChildren).toHaveBeenCalledWith(parent);
    expect(createElement).toHaveBeenCalledWith('p');
    expect(textArg).toBe(body);
    expect(appendChild).toHaveBeenCalledWith(parent, elementArg);
    expect(elementArg.tagName).toBe('P');
    expect(elementArg.textContent).toBe(body);
  });
});
