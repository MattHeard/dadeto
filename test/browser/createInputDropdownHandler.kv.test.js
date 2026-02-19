import { describe, it, expect, jest } from '@jest/globals';
import * as toys from '../../src/browser/toys.js';

describe('createInputDropdownHandler kv type', () => {
  it('removes number input and ensures kv container', () => {
    const select = {};
    const container = { insertBefore: jest.fn() };
    const textInput = {};
    const numberInput = { _dispose: jest.fn() };
    const event = {};

    const dom = {
      getCurrentTarget: jest.fn(() => select),
      getParentElement: jest.fn(() => container),
      querySelector: jest.fn(
        (el, selector) =>
          ({
            'input[type="text"]': textInput,
            'input[type="number"]': numberInput,
          })[selector] ?? null
      ),
      createElement: jest.fn(() => ({})),
      setClassName: jest.fn(),
      getNextSibling: jest.fn(() => null),
      insertBefore: jest.fn(),
      removeChild: jest.fn(),
      removeAllChildren: jest.fn(),
      setType: jest.fn(),
      setPlaceholder: jest.fn(),
      setValue: jest.fn(),
      setDataAttribute: jest.fn(),
      addEventListener: jest.fn(),
      setTextContent: jest.fn(),
      appendChild: jest.fn(),
      getValue: jest.fn(() => 'kv'),
      reveal: jest.fn(),
      enable: jest.fn(),
      hide: jest.fn(),
      disable: jest.fn(),
      querySelectorAll: jest.fn(),
      createTextNode: jest.fn(),
      addClass: jest.fn(),
    };

    const handler = toys.createInputDropdownHandler(dom);

    expect(() => handler(event)).not.toThrow();
    expect(dom.hide).toHaveBeenCalledWith(textInput);
    expect(dom.disable).toHaveBeenCalledWith(textInput);
    expect(dom.removeChild).toHaveBeenCalledWith(container, numberInput);
    expect(dom.insertBefore).toHaveBeenCalled();
  });
});
