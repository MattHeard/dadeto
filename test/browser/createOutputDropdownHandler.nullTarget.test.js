import { describe, it, expect, jest } from '@jest/globals';
import { createOutputDropdownHandler } from '../../src/browser/toys.js';

describe('createOutputDropdownHandler null target', () => {
  it('forwards null currentTarget to handler', () => {
    const handleDropdownChange = jest.fn(() => 'ok');
    const getData = jest.fn();
    const dom = {};

    const handler = createOutputDropdownHandler(handleDropdownChange, getData, dom);
    const event = { currentTarget: null };
    const result = handler(event);

    expect(result).toBe('ok');
    expect(handleDropdownChange).toHaveBeenCalledWith(null, getData, dom);
  });
});
