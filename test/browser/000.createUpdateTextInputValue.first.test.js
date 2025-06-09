import { test, expect, jest } from '@jest/globals';
import { createUpdateTextInputValue } from '../../src/browser/toys.js';

test('createUpdateTextInputValue returns a handler that updates text input', () => {
  const textInput = {};
  const dom = {
    getTargetValue: jest.fn(() => 'value'),
    setValue: jest.fn()
  };
  const handler = createUpdateTextInputValue(textInput, dom);
  expect(typeof handler).toBe('function');
  handler({});
  expect(dom.getTargetValue).toHaveBeenCalled();
  expect(dom.setValue).toHaveBeenCalledWith(textInput, 'value');
});
