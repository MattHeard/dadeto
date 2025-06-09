import { test, expect, jest } from '@jest/globals';
import { createOutputDropdownHandler } from '../../src/browser/toys.js';

test('createOutputDropdownHandler delegates using a fresh handler', () => {
  const handleDropdownChange = jest.fn();
  const getData = jest.fn();
  const dom = {};

  expect(createOutputDropdownHandler.length).toBe(3);

  const handlerA = createOutputDropdownHandler(
    handleDropdownChange,
    getData,
    dom
  );
  const handlerB = createOutputDropdownHandler(
    handleDropdownChange,
    getData,
    dom
  );

  expect(typeof handlerA).toBe('function');
  expect(typeof handlerB).toBe('function');
  expect(handlerA).not.toBe(handlerB);
  expect(handlerA.length).toBe(1);

  const event = { currentTarget: { id: 'x' } };
  handlerA(event);
  expect(handleDropdownChange).toHaveBeenCalledWith(
    event.currentTarget,
    getData,
    dom
  );
});
