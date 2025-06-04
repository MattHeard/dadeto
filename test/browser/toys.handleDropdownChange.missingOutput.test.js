import { describe, test, expect, jest } from '@jest/globals';
import { handleDropdownChange } from '../../src/browser/toys.js';

describe('handleDropdownChange missing output', () => {
  test('does not throw when output object is missing', () => {
    const parent = { child: null, querySelector: jest.fn(() => parent) };
    const dropdown = {
      value: 'text',
      closest: jest.fn(() => ({ id: 'post-id' })),
      parentNode: parent,
    };
    const dom = {
      querySelector: jest.fn((el, selector) => el.querySelector(selector)),
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
    const getData = jest.fn(() => ({}));

    let err;
    try {
      handleDropdownChange(dropdown, getData, dom);
    } catch (e) {
      err = e;
    }
    expect(err).toBeUndefined();
    expect(parent.child.textContent).toBe('');
  });
});
