import { describe, it, expect, jest } from '@jest/globals';
import { handleKVType } from '../../src/browser/toys.js';
import { createNumberInput } from '../../src/core/browser/inputHandlers/number.js';

// Test ensuring createRemoveValueListener disposer runs when handleKVType removes a number input

describe('handleKVType integration with createRemoveValueListener', () => {
  it('disposes the number input listener when removing the input', () => {
    const dom = {
      createElement: jest.fn(() => ({})),
      setType: jest.fn(),
      setValue: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      querySelector: jest.fn(),
      removeChild: jest.fn(),
      setClassName: jest.fn(),
      getNextSibling: jest.fn(() => null),
      insertBefore: jest.fn(),
      removeAllChildren: jest.fn(),
      setPlaceholder: jest.fn(),
      setDataAttribute: jest.fn(),
      setTextContent: jest.fn(),
      appendChild: jest.fn(),
      getValue: jest.fn(() => '{}'),
      querySelectorAll: jest.fn(() => []),
      createTextNode: jest.fn(),
      addClass: jest.fn(),
      hide: jest.fn(),
    };

    const container = {};
    const textInput = { value: '1' };
    const onChange = jest.fn();

    const numberInput = createNumberInput('1', onChange, dom);

    dom.querySelector.mockImplementation((el, selector) => {
      if (selector === 'input[type="number"]') {
        return numberInput;
      }
      return null;
    });

    handleKVType(dom, container, textInput);

    const handler = dom.addEventListener.mock.calls[0][2];
    expect(dom.removeEventListener).toHaveBeenCalledWith(
      numberInput,
      'input',
      handler
    );
    expect(dom.removeChild).toHaveBeenCalledWith(container, numberInput);
  });
});
