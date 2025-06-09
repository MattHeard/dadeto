import { test, expect, jest } from '@jest/globals';
import { createUpdateTextInputValue } from '../../src/browser/toys.js';

test('createUpdateTextInputValue curries dom utilities and updates value', () => {
  const textInput = {};
  const dom = {
    getTargetValue: jest.fn(() => 'abc'),
    setValue: jest.fn(),
  };

  expect(createUpdateTextInputValue.length).toBe(2);
  const handler = createUpdateTextInputValue(textInput, dom);
  expect(typeof handler).toBe('function');
  expect(handler.length).toBe(1);

  const event = {};
  handler(event);

  expect(dom.getTargetValue).toHaveBeenCalledWith(event);
  expect(dom.setValue).toHaveBeenCalledWith(textInput, 'abc');
});
