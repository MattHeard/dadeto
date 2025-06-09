import { describe, it, expect, jest } from '@jest/globals';
import { createOutputDropdownHandler } from '../../src/browser/toys.js';

describe('createOutputDropdownHandler survivor check', () => {
  it('forwards currentTarget and returns handleDropdownChange result', () => {
    const handleDropdownChange = jest.fn(() => 'ok');
    const getData = jest.fn();
    const dom = {};

    const handler = createOutputDropdownHandler(
      handleDropdownChange,
      getData,
      dom
    );
    expect(typeof handler).toBe('function');

    const evt = { currentTarget: { val: 1 } };
    const result = handler(evt);

    expect(result).toBe('ok');
    expect(handleDropdownChange).toHaveBeenCalledWith(
      evt.currentTarget,
      getData,
      dom
    );
  });
});
