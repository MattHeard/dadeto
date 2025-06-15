import { describe, it, expect, jest } from '@jest/globals';
import { createOutputDropdownHandler } from '../../src/browser/toys.js';

describe('createOutputDropdownHandler error propagation', () => {
  it('throws the error from handleDropdownChange', () => {
    const error = new Error('boom');
    const handleDropdownChange = jest.fn(() => {
      throw error;
    });
    const getData = jest.fn();
    const dom = {};
    const handler = createOutputDropdownHandler(handleDropdownChange, getData, dom);
    const evt = { currentTarget: {} };
    expect(() => handler(evt)).toThrow(error);
  });
});
