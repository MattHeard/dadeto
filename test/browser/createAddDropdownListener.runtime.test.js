import { test, expect, jest } from '@jest/globals';

// Dynamically import to ensure the mutated version is loaded during tests
let createAddDropdownListener;

test('createAddDropdownListener imported at runtime registers change handler', async () => {
  ({ createAddDropdownListener } = await import('../../src/browser/toys.js'));
  const onChange = jest.fn();
  const dom = { addEventListener: jest.fn() };
  const dropdown = {};

  const listener = createAddDropdownListener(onChange, dom);
  expect(typeof listener).toBe('function');

  const result = listener(dropdown);

  expect(result).toBeUndefined();
  expect(dom.addEventListener).toHaveBeenCalledWith(
    dropdown,
    'change',
    onChange
  );
});
