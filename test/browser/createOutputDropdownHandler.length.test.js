import { describe, test, expect, jest } from '@jest/globals';
import { createOutputDropdownHandler } from '../../src/browser/toys.js';

describe('createOutputDropdownHandler additional', () => {
  test('returns unary handler that delegates to handleDropdownChange', () => {
    const handle = jest.fn().mockReturnValue('x');
    const getData = jest.fn();
    const dom = {};
    const handler = createOutputDropdownHandler(handle, getData, dom);
    expect(typeof handler).toBe('function');
    expect(handler.length).toBe(1);
    const evt = { currentTarget: { value: 'v' } };
    const result = handler(evt);
    expect(result).toBe('x');
    expect(handle).toHaveBeenCalledWith(evt.currentTarget, getData, dom);
  });
});
