import { describe, it, expect, jest } from '@jest/globals';
import { createOutputDropdownHandler } from '../../src/browser/toys.js';

describe('createOutputDropdownHandler multiple calls', () => {
  it('delegates to handleDropdownChange for each invocation', () => {
    const handleDropdownChange = jest.fn();
    const getData = jest.fn();
    const dom = {};
    const handler = createOutputDropdownHandler(handleDropdownChange, getData, dom);

    const evt1 = { currentTarget: 1 };
    const evt2 = { currentTarget: 2 };
    handler(evt1);
    handler(evt2);

    expect(handleDropdownChange).toHaveBeenNthCalledWith(1, evt1.currentTarget, getData, dom);
    expect(handleDropdownChange).toHaveBeenNthCalledWith(2, evt2.currentTarget, getData, dom);
  });
});
