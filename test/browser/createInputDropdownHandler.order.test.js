import { test, expect, jest } from '@jest/globals';
import { createInputDropdownHandler } from '../../src/browser/toys.js';

test('createInputDropdownHandler calls reveal before enable', () => {
  const select = {};
  const container = {};
  const textInput = {};
  const event = {};

  const reveal = jest.fn();
  const enable = jest.fn();

  const querySelector = jest.fn((_, selector) =>
    selector === 'input[type="text"]' ? textInput : null
  );
  const dom = {
    getCurrentTarget: jest.fn(() => select),
    getParentElement: jest.fn(() => container),
    querySelector,
    getValue: jest.fn(() => 'text'),
    reveal,
    enable,
    hide: jest.fn(),
    disable: jest.fn(),
  };

  const handler = createInputDropdownHandler(dom);
  handler(event);

  expect(reveal).toHaveBeenCalled();
  expect(enable).toHaveBeenCalled();
  expect(reveal.mock.invocationCallOrder[0]).toBeLessThan(enable.mock.invocationCallOrder[0]);
  expect(dom.hide).not.toHaveBeenCalled();
  expect(dom.disable).not.toHaveBeenCalled();
});
