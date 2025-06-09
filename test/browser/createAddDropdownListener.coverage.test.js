import { test, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

test('createAddDropdownListener registers change handler when invoked', () => {
  const onChange = jest.fn();
  const dom = { addEventListener: jest.fn() };
  const dropdown = {};

  const addListener = createAddDropdownListener(onChange, dom);
  const result = addListener(dropdown);

  expect(result).toBeUndefined();
  expect(dom.addEventListener).toHaveBeenCalledWith(dropdown, 'change', onChange);
});
