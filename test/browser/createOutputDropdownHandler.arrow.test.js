import { describe, it, expect, jest } from '@jest/globals';
import { createOutputDropdownHandler } from '../../src/browser/toys.js';

describe('createOutputDropdownHandler arrow behaviour', () => {
  it('forwards the event target using provided dependencies', () => {
    const handleDropdownChange = jest.fn().mockReturnValue('ok');
    const getData = jest.fn();
    const dom = {};

    const handler = createOutputDropdownHandler(
      handleDropdownChange,
      getData,
      dom
    );
    expect(typeof handler).toBe('function');
    expect(handler.length).toBe(1);

    const event = { currentTarget: { value: 'x' } };
    const result = handler(event);

    expect(result).toBe('ok');
    expect(handleDropdownChange).toHaveBeenCalledWith(
      event.currentTarget,
      getData,
      dom
    );
  });
});
