import { test, expect, jest } from '@jest/globals';
import { createOutputDropdownHandler } from '../../src/browser/toys.js';

test('createOutputDropdownHandler string contains expected implementation details', () => {
  const handler = createOutputDropdownHandler(jest.fn(), jest.fn(), {});
  const fnString = handler.toString();
  expect(fnString.startsWith('event =>')).toBe(true);
  expect(fnString).toContain('handleDropdownChange(event.currentTarget, getData, dom)');
  expect(handler.length).toBe(1);
});
