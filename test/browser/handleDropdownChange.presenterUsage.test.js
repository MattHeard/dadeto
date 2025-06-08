import { describe, it, expect, jest } from '@jest/globals';
import { handleDropdownChange } from '../../src/browser/toys.js';

describe('handleDropdownChange presenter usage', () => {
  it('passes the output string to the selected presenter', () => {
    const parent = { child: null, querySelector: jest.fn(() => parent) };
    const dropdown = {
      value: 'text',
      closest: jest.fn(() => ({ id: 'post-presenter' })),
      parentNode: parent,
    };
    const created = { tagName: 'P', textContent: '' };
    const dom = {
      querySelector: jest.fn(() => parent),
      removeAllChildren: jest.fn(),
      createElement: jest.fn(() => created),
      setTextContent: jest.fn((el, txt) => {
        el.textContent = txt;
      }),
      appendChild: jest.fn((p, c) => {
        p.child = c;
      }),
    };
    const getData = jest.fn(() => ({ output: { 'post-presenter': 'hello' } }));

    handleDropdownChange(dropdown, getData, dom);

    expect(dom.createElement).toHaveBeenCalledWith('p');
    expect(dom.setTextContent).toHaveBeenCalledWith(created, 'hello');
    expect(dom.appendChild).toHaveBeenCalledWith(parent, created);
    expect(parent.child).toBe(created);
  });
});
