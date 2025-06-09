import { describe, it, expect, jest } from '@jest/globals';
import { createOutputDropdownHandler } from '../../src/browser/toys.js';

describe('createOutputDropdownHandler undefined target', () => {
  it('handles events without currentTarget', () => {
    const handleDropdownChange = jest.fn();
    const getData = jest.fn();
    const dom = {};

    const handler = createOutputDropdownHandler(handleDropdownChange, getData, dom);

    expect(typeof handler).toBe('function');
    expect(handler.length).toBe(1);

    const result = handler({});

    expect(result).toBeUndefined();
    expect(handleDropdownChange).toHaveBeenCalledWith(undefined, getData, dom);
  });
});
