import { test, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

test('createAddDropdownListener attaches change listeners on multiple calls', () => {
  const dom = { addEventListener: jest.fn() };
  const onChange = jest.fn();
  const dropdownA = {};
  const dropdownB = {};

  const addListener = createAddDropdownListener(onChange, dom);
  expect(typeof addListener).toBe('function');

  addListener(dropdownA);
  addListener(dropdownB);

  expect(dom.addEventListener).toHaveBeenNthCalledWith(1, dropdownA, 'change', onChange);
  expect(dom.addEventListener).toHaveBeenNthCalledWith(2, dropdownB, 'change', onChange);
});
