import { describe, it, expect, jest } from '@jest/globals';
import { handleDropdownChange } from '../../src/browser/toys.js';

describe('setTextContent via handleDropdownChange tic-tac-toe', () => {
  it('uses the tic-tac-toe presenter for "tic-tac-toe" output', () => {
    const created = {};
    const dom = {
      querySelector: jest.fn(() => created),
      removeAllChildren: jest.fn(),
      appendChild: jest.fn(),
      createElement: jest.fn(tag => ({ tagName: tag.toUpperCase() })),
      setTextContent: jest.fn(),
    };
    const dropdown = {
      value: 'tic-tac-toe',
      closest: jest.fn(() => ({ id: 'post-ttt' })),
      parentNode: { querySelector: () => created },
    };
    const getData = jest.fn(() => ({ output: { 'post-ttt': '{}' } }));

    handleDropdownChange(dropdown, getData, dom);

    expect(dom.createElement).toHaveBeenCalledWith('pre');
    expect(dom.appendChild).toHaveBeenCalledWith(created, { tagName: 'PRE' });
  });
});
