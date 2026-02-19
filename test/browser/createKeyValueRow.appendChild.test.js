import { describe, it, expect, jest } from '@jest/globals';
import { createKeyValueRow } from '../../src/browser/toys.js';

describe('createKeyValueRow DOM appends', () => {
  it('appends key, value, toggle, type select and button elements to the row and container', () => {
    const rowEl = {};
    const keyInput = {};
    const valueInput = {};
    const typeSelect = {};
    const toggleBtn = {};
    const button = {};
    const option1 = {};
    const option2 = {};
    const option3 = {};
    const option4 = {};
    const container = {};

    const dom = {
      createElement: jest
        .fn()
        .mockReturnValueOnce(rowEl)
        .mockReturnValueOnce(keyInput)
        .mockReturnValueOnce(valueInput)
        .mockReturnValueOnce(typeSelect)
        .mockReturnValueOnce(option1)
        .mockReturnValueOnce(option2)
        .mockReturnValueOnce(option3)
        .mockReturnValueOnce(option4)
        .mockReturnValueOnce(toggleBtn)
        .mockReturnValueOnce(button),
      setClassName: jest.fn(),
      appendChild: jest.fn(),
      setType: jest.fn(),
      setPlaceholder: jest.fn(),
      setTextContent: jest.fn(),
      setValue: jest.fn(),
      setDataAttribute: jest.fn(),
      addEventListener: jest.fn(),
      addClass: jest.fn(),
      hide: jest.fn(),
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

    // Options appended inside createTypeElement (4 options to select)
    expect(dom.appendChild).toHaveBeenNthCalledWith(1, typeSelect, option1);
    expect(dom.appendChild).toHaveBeenNthCalledWith(2, typeSelect, option2);
    expect(dom.appendChild).toHaveBeenNthCalledWith(3, typeSelect, option3);
    expect(dom.appendChild).toHaveBeenNthCalledWith(4, typeSelect, option4);
    // Row children
    expect(dom.appendChild).toHaveBeenNthCalledWith(5, rowEl, keyInput);
    expect(dom.appendChild).toHaveBeenNthCalledWith(6, rowEl, valueInput);
    expect(dom.appendChild).toHaveBeenNthCalledWith(7, rowEl, toggleBtn);
    expect(dom.appendChild).toHaveBeenNthCalledWith(8, rowEl, typeSelect);
    expect(dom.appendChild).toHaveBeenNthCalledWith(9, rowEl, button);
    expect(dom.appendChild).toHaveBeenNthCalledWith(10, container, rowEl);
  });
});
