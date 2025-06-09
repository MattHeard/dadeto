import { test, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

test('createAddDropdownListener returns unary listener that registers change event', () => {
  const onChange = jest.fn();
  const dom = { addEventListener: jest.fn() };
  const dropdown = {};

  const listener = createAddDropdownListener(onChange, dom);

  expect(typeof listener).toBe('function');
  expect(createAddDropdownListener.length).toBe(2);
  expect(listener.length).toBe(1);

  const result = listener(dropdown);

  expect(result).toBeUndefined();
  expect(dom.addEventListener).toHaveBeenCalledWith(
    dropdown,
    'change',
    onChange
  );
});
