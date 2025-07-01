import { test, expect, jest } from '@jest/globals';
import { createInputDropdownHandler } from '../../src/browser/toys.js';

test('createInputDropdownHandler invokes visibility handlers', () => {
  const select = {};
  const container = {};
  const textInput = {};
  const event = {};

  const dom = {
    getCurrentTarget: jest.fn(() => select),
    getParentElement: jest.fn(() => container),
    querySelector: jest.fn((_, selector) => {
      if (selector === 'input[type="text"]') {
        return textInput;
      }
      return null;
    }),
    getValue: jest.fn(() => 'text'),
    reveal: jest.fn(),
    enable: jest.fn(),
    hide: jest.fn(),
    disable: jest.fn(),
  };

  const handler = createInputDropdownHandler(dom);
  expect(typeof handler).toBe('function');
  expect(handler.length).toBe(1);

  expect(() => handler(event)).not.toThrow();
  expect(dom.reveal).toHaveBeenCalledWith(textInput);
  expect(dom.enable).toHaveBeenCalledWith(textInput);
});
