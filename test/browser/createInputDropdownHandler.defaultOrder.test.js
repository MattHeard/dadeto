import { test, expect, jest } from '@jest/globals';
import { createInputDropdownHandler } from '../../src/browser/toys.js';

test('createInputDropdownHandler hides before disabling text input', () => {
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
    getValue: jest.fn(() => 'unknown'),
    reveal: jest.fn(),
    enable: jest.fn(),
    hide: jest.fn(),
    disable: jest.fn(),
    removeChild: jest.fn(),
    addEventListener: jest.fn(),
    getNextSibling: jest.fn(() => null),
  };

  const handler = createInputDropdownHandler(dom);
  handler(event);

  expect(dom.hide).toHaveBeenCalledWith(textInput);
  expect(dom.disable).toHaveBeenCalledWith(textInput);
  const hideOrder = dom.hide.mock.invocationCallOrder[0];
  const disableOrder = dom.disable.mock.invocationCallOrder[0];
  expect(hideOrder).toBeLessThan(disableOrder);
});
