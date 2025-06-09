import { test, expect, jest } from '@jest/globals';
import { createInputDropdownHandler } from '../../src/browser/toys.js';

test('createInputDropdownHandler handles unknown select values without throwing', () => {
  const select = {};
  const container = {};
  const textInput = {};
  const event = {};

  const dom = {
    getCurrentTarget: jest.fn(() => select),
    getParentElement: jest.fn(() => container),
    querySelector: jest.fn((_, selector) => {
      if (selector === 'input[type="text"]') {return textInput;}
      if (selector === 'input[type="number"]') {return { _dispose: jest.fn() };}
      if (selector === '.kv-container') {return { _dispose: jest.fn() };}
      return null;
    }),
    getValue: jest.fn(() => 'mystery'),
    reveal: jest.fn(),
    enable: jest.fn(),
    hide: jest.fn(),
    disable: jest.fn(),
    removeChild: jest.fn(),
  };

  const handler = createInputDropdownHandler(dom);
  expect(() => handler(event)).not.toThrow();
  expect(dom.hide).toHaveBeenCalledWith(textInput);
  expect(dom.disable).toHaveBeenCalledWith(textInput);
});
