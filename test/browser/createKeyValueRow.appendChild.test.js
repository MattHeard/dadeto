import { describe, it, expect, jest } from '@jest/globals';
import { createKeyValueRow } from '../../src/browser/toys.js';

describe('createKeyValueRow DOM appends', () => {
  it('appends key, value and button elements to the row and container', () => {
    const rowEl = {};
    const keyInput = {};
    const valueInput = {};
    const button = {};
    const container = {};

    const dom = {
      createElement: jest
        .fn()
        .mockReturnValueOnce(rowEl)
        .mockReturnValueOnce(keyInput)
        .mockReturnValueOnce(valueInput)
        .mockReturnValueOnce(button),
      setClassName: jest.fn(),
      appendChild: jest.fn(),
      setType: jest.fn(),
      setPlaceholder: jest.fn(),
      setTextContent: jest.fn(),
      setValue: jest.fn(),
      setDataAttribute: jest.fn(),
      addEventListener: jest.fn(),
    };

    const rowCreator = createKeyValueRow({
      dom,
      entries: [],
      textInput: {},
      rows: {},
      syncHiddenField: () => {},
      disposers: [],
      render: () => {},
      container,
    });

    rowCreator(['a', 'b'], 0);

    expect(dom.appendChild).toHaveBeenNthCalledWith(1, rowEl, keyInput);
    expect(dom.appendChild).toHaveBeenNthCalledWith(2, rowEl, valueInput);
    expect(dom.appendChild).toHaveBeenNthCalledWith(3, rowEl, button);
    expect(dom.appendChild).toHaveBeenNthCalledWith(4, container, rowEl);
  });
});
