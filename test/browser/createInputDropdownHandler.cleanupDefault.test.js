import { describe, it, expect, jest } from '@jest/globals';
import { createInputDropdownHandler } from '../../src/browser/toys.js';

describe('createInputDropdownHandler cleanup default', () => {
  it('removes number and kv inputs for unknown value', () => {
    const select = {};
    const container = {};
    const textInput = {};
    const numberInput = { _dispose: jest.fn() };
    const kvContainer = { _dispose: jest.fn() };
    const event = {};

    const dom = {
      getCurrentTarget: jest.fn(() => select),
      getParentElement: jest.fn(() => container),
      querySelector: jest.fn((parent, selector) => {
        if (selector === 'input[type="text"]') {
          return textInput;
        }
        if (selector === 'input[type="number"]') {
          return numberInput;
        }
        if (selector === '.kv-container') {
          return kvContainer;
        }
        return null;
      }),
      createElement: jest.fn(() => ({})),
      setType: jest.fn(),
      setValue: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      getValue: jest.fn(() => 'unknown'),
      reveal: jest.fn(),
      enable: jest.fn(),
      hide: jest.fn(),
      disable: jest.fn(),
      removeChild: jest.fn(),
      getNextSibling: jest.fn(() => null),
    };

    const handler = createInputDropdownHandler(dom);
    expect(() => handler(event)).not.toThrow();
    expect(dom.removeChild).toHaveBeenCalledWith(container, numberInput);
    expect(dom.removeChild).toHaveBeenCalledWith(container, kvContainer);
  });
});
