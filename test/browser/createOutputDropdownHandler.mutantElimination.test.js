import { describe, it, expect, jest } from '@jest/globals';
import { createOutputDropdownHandler } from '../../src/browser/toys.js';

describe('createOutputDropdownHandler mutation elimination', () => {
  it('delegates to handleDropdownChange using event.currentTarget', () => {
    const handleDropdownChange = jest.fn().mockReturnValue('xyz');
    const getData = jest.fn();
    const dom = {};

    const handler = createOutputDropdownHandler(handleDropdownChange, getData, dom);

    expect(handler.length).toBe(1);
    expect(handler.toString()).toContain('currentTarget');

    const evt = { currentTarget: { value: 42 } };
    const result = handler(evt);

    expect(result).toBe('xyz');
    expect(handleDropdownChange).toHaveBeenCalledWith(evt.currentTarget, getData, dom);
  });
});
