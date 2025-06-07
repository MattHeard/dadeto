import { test, expect, jest } from '@jest/globals';
import { createUpdateTextInputValue } from '../../src/browser/toys.js';

test('createUpdateTextInputValue runtime works', () => {
  const textInput = {};
  const mockDom = {
    getTargetValue: jest.fn(() => 'val'),
    setValue: jest.fn()
  };

  const handler = createUpdateTextInputValue(textInput, mockDom);
  expect(typeof handler).toBe('function');

  handler({});

  expect(mockDom.getTargetValue).toHaveBeenCalled();
  expect(mockDom.setValue).toHaveBeenCalledWith(textInput, 'val');
});
