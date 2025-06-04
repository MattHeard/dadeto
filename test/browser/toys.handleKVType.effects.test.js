import { describe, it, expect, jest } from '@jest/globals';
import { handleKVType } from '../../src/browser/toys.js';

describe('handleKVType effects', () => {
  it('removes number input and sets up key-value container', () => {
    const numberInput = { _dispose: jest.fn() };
    const container = {};
    const textInput = {};
    const querySelector = jest.fn((el, selector) => {
      if (selector === 'input[type="number"]') {
        return numberInput;
      }
      return null;
    });
    const removeChild = jest.fn();
    const createElement = jest.fn(() => ({}));
    const insertBefore = jest.fn();
    const dom = {
      querySelector,
      removeChild,
      createElement,
      setClassName: jest.fn(),
      getNextSibling: jest.fn(),
      insertBefore,
      removeAllChildren: jest.fn(),
      setType: jest.fn(),
      setPlaceholder: jest.fn(),
      setValue: jest.fn(),
      setDataAttribute: jest.fn(),
      addEventListener: jest.fn(),
      setTextContent: jest.fn(),
      appendChild: jest.fn(),
      getValue: jest.fn(() => '{}'),
      querySelectorAll: jest.fn(),
      createTextNode: jest.fn(),
    };

    handleKVType(dom, container, textInput);

    expect(querySelector).toHaveBeenCalledWith(container, 'input[type="number"]');
    expect(removeChild).toHaveBeenCalledWith(container, numberInput);
    expect(querySelector).toHaveBeenCalledWith(container, '.kv-container');
    expect(createElement).toHaveBeenCalledWith('div');
    expect(insertBefore).toHaveBeenCalled();
  });
});
