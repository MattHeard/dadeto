import { test, expect, jest } from '@jest/globals';
import { createInputDropdownHandler } from '../../src/browser/toys.js';

test('createInputDropdownHandler handles number then text sequentially', () => {
  const select = {};
  const container = { insertBefore: jest.fn() };
  const textInput = {};
  const numberInput = {};
  const event = {};

  const elements = {
    'input[type="text"]': textInput,
    'input[type="number"]': null,
  };
  const querySelector = jest.fn((_, selector) => elements[selector] ?? null);

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
  querySelector.mockImplementation((_, selector) => {
    const map = {
      'input[type="text"]': textInput,
      'input[type="number"]': numberInput,
    };
    return map[selector] ?? null;
  });

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
