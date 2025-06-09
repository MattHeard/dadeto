import { test, expect, jest } from '@jest/globals';
import { createInputDropdownHandler } from '../../src/browser/toys.js';

test('createInputDropdownHandler handles sequential text then unknown values', () => {
  const event = {};
  const select = {};
  const container = {};
  const textInput = {};

  const dom = {
    getCurrentTarget: jest.fn(() => select),
    getParentElement: jest.fn(() => container),
    querySelector: jest.fn((_, selector) =>
      selector === 'input[type="text"]' ? textInput : null
    ),
    getValue: jest
      .fn()
      .mockReturnValueOnce('text')
      .mockReturnValueOnce('unknown'),
    reveal: jest.fn(),
    enable: jest.fn(),
    hide: jest.fn(),
    disable: jest.fn(),
  };

  const handler = createInputDropdownHandler(dom);

  expect(() => handler(event)).not.toThrow();
  expect(dom.reveal).toHaveBeenCalledWith(textInput);
  expect(dom.enable).toHaveBeenCalledWith(textInput);
  expect(dom.hide).not.toHaveBeenCalled();
  expect(dom.disable).not.toHaveBeenCalled();

  dom.reveal.mockClear();
  dom.enable.mockClear();

  expect(() => handler(event)).not.toThrow();
  expect(dom.hide).toHaveBeenCalledWith(textInput);
  expect(dom.disable).toHaveBeenCalledWith(textInput);
});
