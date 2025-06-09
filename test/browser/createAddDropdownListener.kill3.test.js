import { test, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

test('createAddDropdownListener registers handler and forwards events', () => {
  const onChange = jest.fn();
  const dom = { addEventListener: jest.fn() };
  const dropdown = {};

  const add = createAddDropdownListener(onChange, dom);
  add(dropdown);

  expect(dom.addEventListener).toHaveBeenCalledWith(dropdown, 'change', onChange);

  const [, , handler] = dom.addEventListener.mock.calls[0];
  handler({ currentTarget: dropdown });
  expect(onChange).toHaveBeenCalledWith({ currentTarget: dropdown });
});
