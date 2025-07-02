import { describe, it, expect, jest } from '@jest/globals';
import * as toys from '../../src/browser/toys.js';

/**
 * Additional test targeting the typeHandlers object literal mutant.
 * Ensures the number branch invokes the expected DOM operations
 * without throwing an error.
 */
describe('createInputDropdownHandler number type', () => {
  it('removes KV container and ensures a number input', () => {
    const select = {};
    const container = { insertBefore: jest.fn() };
    const textInput = { value: '42' };
    const kvContainer = { _dispose: jest.fn() };
    const event = {};

    const dom = {
      getCurrentTarget: jest.fn(() => select),
      getParentElement: jest.fn(() => container),
      querySelector: jest.fn((el, selector) => {
        const map = {
          'input[type="text"]': textInput,
          'input[type="number"]': null,
          '.kv-container': kvContainer,
        };
        const result = map[selector];
        if (result === undefined) {
          return null;
        }
        return result;
      }),
      createElement: jest.fn(() => ({})),
      setType: jest.fn(),
      setValue: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      getValue: jest.fn(() => 'number'),
      reveal: jest.fn(),
      enable: jest.fn(),
      hide: jest.fn(),
      disable: jest.fn(),
      removeChild: jest.fn(),
      getNextSibling: jest.fn(() => null),
    };

    // Ensure number input is inserted when selecting number type

    const handler = toys.createInputDropdownHandler(dom);

    expect(() => handler(event)).not.toThrow();
    expect(dom.removeChild).toHaveBeenCalledWith(container, kvContainer);
    expect(container.insertBefore).toHaveBeenCalledWith(expect.anything(), null);
    expect(dom.createElement).toHaveBeenCalledWith('input');
  });
});
