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

  it('uses the copy-to-clipboard presenter for clipboard output', () => {
    const created = {};
    const dom = {
      querySelector: jest.fn(() => created),
      removeAllChildren: jest.fn(),
      appendChild: jest.fn(),
      createElement: jest.fn(() => ({ tagName: 'BUTTON' })),
      setTextContent: jest.fn(),
      setType: jest.fn(),
      addEventListener: jest.fn(),
      logError: jest.fn(),
      globalThis: {
        navigator: {
          clipboard: {
            writeText: jest.fn().mockResolvedValue(undefined),
          },
        },
      },
    };
    const dropdown = {
      value: 'copy-to-clipboard',
      closest: jest.fn(() => ({ id: 'post-id' })),
      parentNode: { querySelector: () => created },
    };
    const getData = jest.fn(() => ({ output: { 'post-id': 'hello' } }));

    handleDropdownChange(dropdown, getData, dom);

    expect(dom.createElement).toHaveBeenCalledWith('button');
    expect(dom.setType).toHaveBeenCalledWith({ tagName: 'BUTTON' }, 'button');
    expect(dom.setTextContent).toHaveBeenCalledWith(
      { tagName: 'BUTTON' },
      'Copy to clipboard'
    );
    expect(dom.addEventListener).toHaveBeenCalledWith(
      { tagName: 'BUTTON' },
      'click',
      expect.any(Function)
    );
    expect(dom.appendChild).toHaveBeenCalledWith(created, {
      tagName: 'BUTTON',
    });
  });
});
