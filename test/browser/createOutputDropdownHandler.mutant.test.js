import { test, expect, jest } from '@jest/globals';
import { createOutputDropdownHandler } from '../../src/browser/toys.js';

test('createOutputDropdownHandler returns unary handler that delegates', () => {
  const handleDropdownChange = jest.fn();
  const getData = jest.fn();
  const dom = {};

  const handler = createOutputDropdownHandler(handleDropdownChange, getData, dom);
  expect(typeof handler).toBe('function');
  expect(handler.length).toBe(1);

  const event = { currentTarget: {} };
  handler(event);

  expect(handleDropdownChange).toHaveBeenCalledWith(event.currentTarget, getData, dom);
});
