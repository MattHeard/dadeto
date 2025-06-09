import { test, expect, jest } from '@jest/globals';
import { createOutputDropdownHandler } from '../../src/browser/toys.js';

test('createOutputDropdownHandler forwards events via unary handler', () => {
  const handleDropdownChange = jest.fn().mockReturnValue('ok');
  const getData = jest.fn();
  const dom = {};

  expect(createOutputDropdownHandler.length).toBe(3);
  const handler = createOutputDropdownHandler(
    handleDropdownChange,
    getData,
    dom
  );
  expect(typeof handler).toBe('function');
  expect(handler.length).toBe(1);

  const event = { currentTarget: { id: 'x' } };
  const result = handler(event);

  expect(result).toBe('ok');
  expect(handleDropdownChange).toHaveBeenCalledWith(
    event.currentTarget,
    getData,
    dom
  );
});
