import { test, expect, jest } from '@jest/globals';
import { createInputDropdownHandler } from '../../src/browser/toys.js';

test('createInputDropdownHandler handles number then text sequentially', () => {
  const select = {};
  const container = { insertBefore: jest.fn() };
  const textInput = {};
  const numberInput = {};
  const event = {};

  const selectorMap = { 'input[type="text"]': textInput };
  const querySelector = jest.fn((_, selector) => selectorMap[selector] || null);

  const dom = {
    getCurrentTarget: jest.fn(() => select),
    getParentElement: jest.fn(() => container),
    querySelector,
    createElement: jest.fn(() => numberInput),
    setType: jest.fn(),
    setValue: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    getValue: jest
      .fn()
      .mockReturnValueOnce('number')
      .mockReturnValueOnce('text'),
    reveal: jest.fn(),
    enable: jest.fn(),
    hide: jest.fn(),
    disable: jest.fn(),
    removeChild: jest.fn(),
    getNextSibling: jest.fn(() => null),
  };

  const handler = createInputDropdownHandler(dom);

  expect(() => handler(event)).not.toThrow();
  expect(container.insertBefore).toHaveBeenCalledWith(numberInput, null);
  expect(dom.hide).toHaveBeenCalledWith(textInput);
  expect(dom.disable).toHaveBeenCalledWith(textInput);

  // After first call, number input exists
  const selectorMap2 = {
    'input[type="text"]': textInput,
    'input[type="number"]': numberInput,
  };
  querySelector.mockImplementation((_, selector) => selectorMap2[selector] || null);

  dom.hide.mockClear();
  dom.disable.mockClear();
  dom.reveal.mockClear();
  dom.enable.mockClear();

  expect(() => handler(event)).not.toThrow();
  expect(dom.reveal).toHaveBeenCalledWith(textInput);
  expect(dom.enable).toHaveBeenCalledWith(textInput);
  expect(dom.hide).not.toHaveBeenCalled();
  expect(dom.disable).not.toHaveBeenCalled();
});
