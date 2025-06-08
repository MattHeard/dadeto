import { describe, it, expect, jest } from '@jest/globals';
import { handleDropdownChange } from '../../src/browser/toys.js';

describe('setTextContent via handleDropdownChange', () => {
  it('uses the paragraph presenter for "text" output', () => {
    const created = {};
    const dom = {
      querySelector: jest.fn(() => created),
      removeAllChildren: jest.fn(),
      appendChild: jest.fn(),
      createElement: jest.fn(() => ({ tagName: 'P' })),
      setTextContent: jest.fn(),
    };
    const dropdown = {
      value: 'text',
      closest: jest.fn(() => ({ id: 'post-id' })),
      parentNode: { querySelector: () => created },
    };
    const getData = jest.fn(() => ({ output: { 'post-id': 'hello' } }));

    handleDropdownChange(dropdown, getData, dom);

    expect(dom.createElement).toHaveBeenCalledWith('p');
    expect(dom.appendChild).toHaveBeenCalledWith(created, { tagName: 'P' });
  });

  it('uses the pre presenter for "pre" output', () => {
    const created = {};
    const dom = {
      querySelector: jest.fn(() => created),
      removeAllChildren: jest.fn(),
      appendChild: jest.fn(),
      createElement: jest.fn(() => ({ tagName: 'PRE' })),
      setTextContent: jest.fn(),
    };
    const dropdown = {
      value: 'pre',
      closest: jest.fn(() => ({ id: 'post-id' })),
      parentNode: { querySelector: () => created },
    };
    const getData = jest.fn(() => ({ output: { 'post-id': 'hello' } }));

    handleDropdownChange(dropdown, getData, dom);

    expect(dom.createElement).toHaveBeenCalledWith('pre');
    expect(dom.setTextContent).toHaveBeenCalledWith(
      { tagName: 'PRE' },
      'hello'
    );
    expect(dom.appendChild).toHaveBeenCalledWith(created, { tagName: 'PRE' });
  });
});
