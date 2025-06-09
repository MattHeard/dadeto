import { describe, it, expect, jest } from '@jest/globals';
import { createOutputDropdownHandler } from '../../src/browser/toys.js';

describe('createOutputDropdownHandler mutant killer', () => {
  it('delegates to handleDropdownChange and returns its result', () => {
    const expected = 'ok';
    const handleDropdownChange = jest.fn().mockReturnValue(expected);
    const getData = jest.fn();
    const dom = {};

    const handler = createOutputDropdownHandler(handleDropdownChange, getData, dom);

    expect(createOutputDropdownHandler.length).toBe(3);
    expect(typeof handler).toBe('function');
    expect(handler.length).toBe(1);

    const event = { currentTarget: { val: 42 } };
    const result = handler(event);

    expect(result).toBe(expected);
    expect(handleDropdownChange).toHaveBeenCalledWith(event.currentTarget, getData, dom);
  });
});
