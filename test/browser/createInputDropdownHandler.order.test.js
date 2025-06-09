import { test, expect, jest } from '@jest/globals';
import { createInputDropdownHandler } from '../../src/browser/toys.js';

test('createInputDropdownHandler reveals before enabling text input', () => {
  const select = {};
  const container = {};
  const textInput = {};
  const event = {};

  const dom = {
    getCurrentTarget: jest.fn(() => select),
    getParentElement: jest.fn(() => container),
    querySelector: jest.fn((_, selector) =>
      selector === 'input[type="text"]' ? textInput : null
    ),
    getValue: jest.fn(() => 'text'),
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

  expect(dom.reveal).toHaveBeenCalledWith(textInput);
  expect(dom.enable).toHaveBeenCalledWith(textInput);
  const revealOrder = dom.reveal.mock.invocationCallOrder[0];
  const enableOrder = dom.enable.mock.invocationCallOrder[0];
  expect(revealOrder).toBeLessThan(enableOrder);
});
