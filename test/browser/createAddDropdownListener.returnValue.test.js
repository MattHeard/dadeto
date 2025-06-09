import { test, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

test('createAddDropdownListener ignores addEventListener return value', () => {
  const onChange = jest.fn();
  const dom = { addEventListener: jest.fn(() => 'listener-id') };
  const dropdown = {};

  const addListener = createAddDropdownListener(onChange, dom);
  const result = addListener(dropdown);

  expect(result).toBeUndefined();
  expect(dom.addEventListener).toHaveBeenCalledWith(
    dropdown,
    'change',
    onChange
  );
});
