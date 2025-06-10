import { test, expect, jest } from '@jest/globals';
import { createOutputDropdownHandler } from '../../src/browser/toys.js';

test('createOutputDropdownHandler forwards handler result and parameters', () => {
  const expected = 'done';
  const handleDropdownChange = jest.fn(() => expected);
  const getData = jest.fn();
  const dom = {};
  const handler = createOutputDropdownHandler(handleDropdownChange, getData, dom);

  const evt = { currentTarget: { value: 'x' } };
  const result = handler(evt);

  expect(result).toBe(expected);
  expect(handleDropdownChange).toHaveBeenCalledWith(evt.currentTarget, getData, dom);
});
