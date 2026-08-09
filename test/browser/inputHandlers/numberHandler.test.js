import { jest } from '@jest/globals';
import { numberHandler } from '../../../src/core/browser/inputHandlers/number.js';

test('hides the text input, cleans the container, and ensures a number input', () => {
  const textInput = { value: '7' };
  const container = { insertBefore: jest.fn() };
  const dom = {
    hide: jest.fn(),
    disable: jest.fn(),
    querySelector: jest.fn(() => null),
    createElement: jest.fn(() => ({})),
    setType: jest.fn(),
    setValue: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    getNextSibling: jest.fn(() => null),
  };

  numberHandler(dom, container, textInput);

  expect(dom.hide).toHaveBeenCalledWith(textInput);
  expect(dom.disable).toHaveBeenCalledWith(textInput);
  expect(dom.querySelector).toHaveBeenCalledWith(
    container,
    'input[type="number"]'
  );
  expect(dom.createElement).toHaveBeenCalledWith('input');
});
