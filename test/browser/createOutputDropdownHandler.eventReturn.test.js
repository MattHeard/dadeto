import { test, expect, jest } from '@jest/globals';
import { createOutputDropdownHandler } from '../../src/browser/toys.js';

test('createOutputDropdownHandler delegates via unary handler', () => {
  const handleDropdownChange = jest
    .fn()
    .mockReturnValueOnce('first')
    .mockReturnValueOnce('second');
  const getData = jest.fn();
  const dom = {};
  const handler = createOutputDropdownHandler(
    handleDropdownChange,
    getData,
    dom
  );

  expect(typeof handler).toBe('function');
  expect(handler.length).toBe(1);

  const evt1 = { currentTarget: { id: 'a' } };
  const evt2 = { currentTarget: { id: 'b' } };

  const result1 = handler(evt1);
  const result2 = handler(evt2);

  expect(result1).toBe('first');
  expect(result2).toBe('second');
  expect(handleDropdownChange).toHaveBeenNthCalledWith(
    1,
    evt1.currentTarget,
    getData,
    dom
  );
  expect(handleDropdownChange).toHaveBeenNthCalledWith(
    2,
    evt2.currentTarget,
    getData,
    dom
  );
});
