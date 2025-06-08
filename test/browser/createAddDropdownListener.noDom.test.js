import { describe, it, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

describe('createAddDropdownListener missing dom.addEventListener', () => {
  it('throws a TypeError mentioning addEventListener when dom lacks it', () => {
    const onChange = jest.fn();
    const dom = {}; // no addEventListener
    const listener = createAddDropdownListener(onChange, dom);
    expect(() => listener({})).toThrow(/addEventListener/);
  });
});
