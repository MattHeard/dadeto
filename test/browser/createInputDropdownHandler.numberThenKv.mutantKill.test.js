import { test, expect, jest } from '@jest/globals';
import { createInputDropdownHandler } from '../../src/browser/toys.js';

test('createInputDropdownHandler handles number then kv sequentially', () => {
  const select = {};
  const container = { insertBefore: jest.fn() };
  const textInput = {};
  const numberInput = { _dispose: jest.fn() };
  const kvContainer = { _dispose: jest.fn() };
  const event = {};

  const dom = {
    getCurrentTarget: jest.fn(() => select),
    getParentElement: jest.fn(() => container),
    querySelector: jest.fn(
      (_, selector) =>
        ({
          'input[type="text"]': textInput,
          'input[type="number"]': numberInput,
          '.kv-container': kvContainer,
        })[selector] ?? null
    ),
    createElement: jest.fn(() => ({})),
    getNextSibling: jest.fn(() => null),
    insertBefore: jest.fn(),
    setType: jest.fn(),
    setValue: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    removeChild: jest.fn(),
    removeAllChildren: jest.fn(),
    setClassName: jest.fn(),
    setPlaceholder: jest.fn(),
    setDataAttribute: jest.fn(),
    setTextContent: jest.fn(),
    appendChild: jest.fn(),
    querySelectorAll: jest.fn(),
    createTextNode: jest.fn(),
    getValue: jest.fn().mockReturnValueOnce('number').mockReturnValueOnce('kv'),
    reveal: jest.fn(),
    enable: jest.fn(),
    hide: jest.fn(),
    disable: jest.fn(),
    addClass: jest.fn(),
  };

  const handler = createInputDropdownHandler(dom);

  expect(() => handler(event)).not.toThrow();

  dom.insertBefore.mockClear();

  expect(() => handler(event)).not.toThrow();
  expect(dom.removeChild).toHaveBeenCalledWith(container, numberInput);
});
