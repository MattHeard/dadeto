import { describe, it, expect, jest } from '@jest/globals';
import { createOutputDropdownHandler } from '../../src/browser/toys.js';

describe('createOutputDropdownHandler repeated calls', () => {
  it('delegates each event to handleDropdownChange', () => {
    const handleDropdownChange = jest
      .fn()
      .mockReturnValueOnce('first')
      .mockReturnValueOnce('second');
    const getData = jest.fn();
    const dom = {};

    const handler = createOutputDropdownHandler(handleDropdownChange, getData, dom);

    const event1 = { currentTarget: { value: 'a' } };
    const event2 = { currentTarget: { value: 'b' } };

    const result1 = handler(event1);
    const result2 = handler(event2);

    expect(result1).toBe('first');
    expect(result2).toBe('second');
    expect(handleDropdownChange).toHaveBeenNthCalledWith(
      1,
      event1.currentTarget,
      getData,
      dom
    );
    expect(handleDropdownChange).toHaveBeenNthCalledWith(
      2,
      event2.currentTarget,
      getData,
      dom
    );
  });
});
