import { describe, test, expect, jest } from '@jest/globals';
import { handleDropdownChange } from '../../src/browser/toys.js';

describe('handleDropdownChange null output', () => {
  test('does not throw when data.output is null', () => {
    const parent = { child: null, querySelector: jest.fn() };
    parent.querySelector.mockReturnValue(parent);
    const dropdown = {
      value: 'text',
      closest: jest.fn(() => ({ id: 'null-post' })),
      parentNode: parent,
    };
    const getData = jest.fn(() => ({ output: null }));
    const dom = {
      querySelector: (el, selector) => el.querySelector(selector),
      removeAllChildren: jest.fn(p => {
        p.child = null;
      }),
      appendChild: jest.fn((p, c) => {
        p.child = c;
      }),
      createElement: jest.fn(() => ({ textContent: '' })),
      setTextContent: jest.fn((el, txt) => {
        el.textContent = txt;
      }),
    };

    expect(() => handleDropdownChange(dropdown, getData, dom)).not.toThrow();
    expect(parent.child.textContent).toBe('');
  });
});
