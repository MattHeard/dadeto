import { test, expect, jest } from '@jest/globals';
import { createOutputDropdownHandler } from '../../src/browser/toys.js';

test('createOutputDropdownHandler returns handler result for each event', () => {
  const handleDropdownChange = jest.fn()
    .mockReturnValueOnce('first')
    .mockReturnValueOnce('second');
  const getData = jest.fn();
  const dom = {};
  const handler = createOutputDropdownHandler(handleDropdownChange, getData, dom);

  const eventA = { currentTarget: {} };
  const eventB = { currentTarget: {} };

  const result1 = handler(eventA);
  const result2 = handler(eventB);

  expect(result1).toBe('first');
  expect(result2).toBe('second');
  expect(handleDropdownChange).toHaveBeenNthCalledWith(1, eventA.currentTarget, getData, dom);
  expect(handleDropdownChange).toHaveBeenNthCalledWith(2, eventB.currentTarget, getData, dom);
});
