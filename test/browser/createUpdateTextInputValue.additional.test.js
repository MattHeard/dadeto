import { test, expect, jest } from '@jest/globals';
import { createUpdateTextInputValue } from '../../src/browser/toys.js';

test('createUpdateTextInputValue returns handler that forwards value', () => {
  const textInput = {};
  const dom = {
    getTargetValue: jest.fn(() => 'added'),
    setValue: jest.fn(),
  };

  const handler = createUpdateTextInputValue(textInput, dom);
  expect(typeof handler).toBe('function');
  expect(handler.length).toBe(1);

  const ev = {};
  handler(ev);

  expect(dom.getTargetValue).toHaveBeenCalledWith(ev);
  expect(dom.setValue).toHaveBeenCalledWith(textInput, 'added');
});
