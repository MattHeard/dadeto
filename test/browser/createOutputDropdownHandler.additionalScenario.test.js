import { describe, it, expect, jest } from '@jest/globals';
import { createOutputDropdownHandler } from '../../src/browser/toys.js';

describe('createOutputDropdownHandler additional scenario', () => {
  it('delegates to handleDropdownChange with provided dependencies', () => {
    const handleDropdownChange = jest.fn(() => 'value');
    const getData = jest.fn();
    const dom = { helper: () => true };

    const handler = createOutputDropdownHandler(handleDropdownChange, getData, dom);

    const evt = { currentTarget: { id: 'a' } };
    const result = handler(evt);

    expect(result).toBe('value');
    expect(handleDropdownChange).toHaveBeenCalledWith(evt.currentTarget, getData, dom);
  });
});
