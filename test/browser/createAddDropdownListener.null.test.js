import { test, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

test('createAddDropdownListener handles null dropdown', () => {
  const onChange = jest.fn();
  const dom = { addEventListener: jest.fn() };

  const addListener = createAddDropdownListener(onChange, dom);
  addListener(null);

  expect(dom.addEventListener).toHaveBeenCalledWith(null, 'change', onChange);
});
