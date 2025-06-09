import { test, expect, jest } from '@jest/globals';
import { createUpdateTextInputValue } from '../../src/browser/toys.js';

test('createUpdateTextInputValue handles multiple events', () => {
  const textInput = {};
  const dom = {
    getTargetValue: jest.fn(),
    setValue: jest.fn(),
  };

  const handler = createUpdateTextInputValue(textInput, dom);

  const event1 = { id: 1 };
  dom.getTargetValue.mockReturnValueOnce('first');
  handler(event1);

  const event2 = { id: 2 };
  dom.getTargetValue.mockReturnValueOnce('second');
  handler(event2);

  expect(dom.getTargetValue).toHaveBeenNthCalledWith(1, event1);
  expect(dom.setValue).toHaveBeenNthCalledWith(1, textInput, 'first');
  expect(dom.getTargetValue).toHaveBeenNthCalledWith(2, event2);
  expect(dom.setValue).toHaveBeenNthCalledWith(2, textInput, 'second');
});
