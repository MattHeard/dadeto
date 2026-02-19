import { describe, it, expect, jest } from '@jest/globals';
import { createInputDropdownHandler } from '../../src/browser/toys.js';

describe('createInputDropdownHandler all types', () => {
  it('invokes handlers for text, number, kv and unknown types', () => {
    const select = {};
    const container = { insertBefore: jest.fn() };
    const textInput = {};
    const numberInput = { _dispose: jest.fn() };
    const kvContainer = { _dispose: jest.fn() };
    const event = {};
    let numberQueryCount = 0;
    let textareaElement;

    /**
     * Returns the number input element on subsequent calls.
     * @returns {object|null} Number input element after first invocation.
     */
    function handleNumberQuery() {
      numberQueryCount += 1;
      if (numberQueryCount > 1) {
        return numberInput;
      }
      return null;
    }

    const queryHandlers = {
      'input[type="text"]': () => textInput,
      '.kv-container': () => kvContainer,
      'input[type="number"]': handleNumberQuery,
      '.toy-textarea': () => textareaElement,
    };

    /**
     * Looks up a query handler for the provided selector.
     * @param {*} _ - unused element reference
     * @param {string} selector - selector to look up
     * @returns {*} the result of the handler or null
     */
    function mockQuerySelector(_, selector) {
      const handler = queryHandlers[selector];
      if (handler) {
        return handler();
      }
      return null;
    }

    const dom = {
      getCurrentTarget: jest.fn(() => select),
      getParentElement: jest.fn(() => container),
      querySelector: jest.fn(mockQuerySelector),
      createElement: jest.fn(tag => {
        if (tag === 'textarea') {
          textareaElement = { _dispose: jest.fn() };
          return textareaElement;
        }
        return {};
      }),
      setClassName: jest.fn(),
      getNextSibling: jest.fn(() => null),
      insertBefore: jest.fn(),
      removeChild: jest.fn(),
      removeAllChildren: jest.fn(),
      removeEventListener: jest.fn(),
      setType: jest.fn(),
      setPlaceholder: jest.fn(),
      setValue: jest.fn(),
      setDataAttribute: jest.fn(),
      addEventListener: jest.fn(),
      setTextContent: jest.fn(),
      appendChild: jest.fn(),
      getValue: jest
        .fn()
        .mockReturnValueOnce('text')
        .mockReturnValueOnce('textarea')
        .mockReturnValueOnce('number')
        .mockReturnValueOnce('kv')
        .mockReturnValueOnce('unknown'),
      reveal: jest.fn(),
      enable: jest.fn(),
      hide: jest.fn(),
      disable: jest.fn(),
      querySelectorAll: jest.fn(),
      createTextNode: jest.fn(),
      getTargetValue: jest.fn(),
      addClass: jest.fn(),
    };

    const handler = createInputDropdownHandler(dom);

    // text handler
    expect(() => handler(event)).not.toThrow();
    expect(dom.reveal).toHaveBeenCalledWith(textInput);
    expect(dom.enable).toHaveBeenCalledWith(textInput);

    // textarea handler
    expect(() => handler(event)).not.toThrow();
    expect(dom.createElement).toHaveBeenCalledWith('textarea');
    expect(dom.hide).toHaveBeenCalledWith(textInput);
    expect(dom.disable).toHaveBeenCalledWith(textInput);

    // number handler
    expect(() => handler(event)).not.toThrow();
    expect(dom.removeChild).toHaveBeenCalledWith(container, kvContainer);
    expect(dom.removeChild).toHaveBeenCalledWith(container, textareaElement);

    // kv handler
    expect(() => handler(event)).not.toThrow();
    expect(dom.hide).toHaveBeenCalledWith(textInput);
    expect(dom.disable).toHaveBeenCalledWith(textInput);

    // unknown handler falls back to default
    expect(() => handler(event)).not.toThrow();
    expect(dom.hide).toHaveBeenCalledWith(textInput);
    expect(dom.disable).toHaveBeenCalledWith(textInput);
  });
});
