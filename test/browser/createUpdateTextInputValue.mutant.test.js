import { test, expect, jest } from '@jest/globals';
import { createUpdateTextInputValue } from '../../src/browser/toys.js';

test('createUpdateTextInputValue returns unary handler and updates value', () => {
  const textInput = {};
  const dom = {
    getTargetValue: jest.fn(() => 'hello'),
    setValue: jest.fn(),
  };

  const handler = createUpdateTextInputValue(textInput, dom);
  expect(typeof handler).toBe('function');
  expect(handler.length).toBe(1);

  const event = {};
  handler(event);

  expect(dom.getTargetValue).toHaveBeenCalledWith(event);
  expect(dom.setValue).toHaveBeenCalledWith(textInput, 'hello');
});
