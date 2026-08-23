import { describe, it, expect, jest } from '@jest/globals';
import { createKeyValueRow } from '../../src/browser/toys.js';

describe('createKeyValueRow DOM appends', () => {
  it('appends key, value, toggle, type select and button elements to the row and container', () => {
    const rowEl = {};
    const keyInput = {};
    const valueInput = {};
    const typeSelect = {};
    const typeWrapper = {};
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
        .mockReturnValueOnce(typeWrapper)
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
      entries: [['a', 'b']],
      textInput: {},
      rowData: { rows: { a: 'b' }, rowTypes: { a: 'string' } },
      syncHiddenField: () => {},
      disposers: [],
      render: () => {},
      container,
    });

    rowCreator(['a', 'b'], 0);

    // Options appended inside createTypeElement (4 options to select)
    expect(dom.createElement).toHaveBeenCalledWith('div');
    expect(dom.setClassName).toHaveBeenCalledWith(rowEl, 'kv-row');
    expect(dom.setTextContent).toHaveBeenCalledWith(button, '+');
    expect(dom.setType).toHaveBeenCalledWith(button, 'button');
    expect(dom.createElement).toHaveBeenCalledWith('button');
    expect(
      dom.createElement.mock.calls.filter(([tag]) => tag === 'button')
    ).toHaveLength(2);
    expect(dom.appendChild).toHaveBeenNthCalledWith(1, typeSelect, option1);
    expect(dom.appendChild).toHaveBeenNthCalledWith(2, typeSelect, option2);
    expect(dom.appendChild).toHaveBeenNthCalledWith(3, typeSelect, option3);
    expect(dom.appendChild).toHaveBeenNthCalledWith(4, typeSelect, option4);
    expect(dom.appendChild).toHaveBeenNthCalledWith(5, typeWrapper, typeSelect);
    // Row children
    expect(dom.appendChild).toHaveBeenNthCalledWith(6, rowEl, keyInput);
    expect(dom.appendChild).toHaveBeenNthCalledWith(7, rowEl, valueInput);
    expect(dom.appendChild).toHaveBeenNthCalledWith(8, rowEl, toggleBtn);
    expect(dom.appendChild).toHaveBeenNthCalledWith(9, rowEl, typeWrapper);
    expect(dom.appendChild).toHaveBeenNthCalledWith(10, rowEl, button);
    expect(dom.appendChild).toHaveBeenNthCalledWith(11, container, rowEl);
  });
});

it('selects a remove button for non-final rows', () => {
  const dom = {
    createElement: jest.fn(tag => {
      if (tag === '') throw new Error('element tag must not be blank');
      return { tag };
    }),
    setClassName: jest.fn(),
    setType: jest.fn(),
    setPlaceholder: jest.fn(),
    setValue: jest.fn(),
    setDataAttribute: jest.fn(),
    setTextContent: jest.fn(),
    appendChild: jest.fn(),
    addClass: jest.fn(),
    hide: jest.fn(),
    reveal: jest.fn(),
    addEventListener: jest.fn(),
  };
  const rowCreator = createKeyValueRow({
    dom,
    entries: [
      ['a', 'b'],
      ['c', 'd'],
    ],
    textInput: {},
    rowData: { rows: { a: 'b' }, rowTypes: { a: 'string' } },
    syncHiddenField: jest.fn(),
    disposers: [],
    render: jest.fn(),
    container: {},
  });
  rowCreator(['a', 'b'], 0);
  expect(dom.setTextContent).toHaveBeenCalledWith(expect.any(Object), '×');
});

it('uses fresh row state when row construction receives null row data', () => {
  const dom = {
    createElement: jest.fn(tag => {
      if (tag === '') throw new Error('element tag must not be blank');
      return { tag };
    }),
    setClassName: jest.fn(),
    setType: jest.fn(),
    setPlaceholder: jest.fn(),
    setValue: jest.fn(),
    setDataAttribute: jest.fn(),
    setTextContent: jest.fn(),
    appendChild: jest.fn(),
    addClass: jest.fn(),
    hide: jest.fn(),
    reveal: jest.fn(),
    addEventListener: jest.fn(),
  };
  const render = jest.fn();
  const rowCreator = createKeyValueRow({
    dom,
    entries: [['a', 'b']],
    textInput: {},
    rowData: null,
    syncHiddenField: jest.fn(),
    disposers: [],
    render,
    container: {},
  });
  expect(() => rowCreator(['a', 'b'], 0)).not.toThrow();
  const button = dom.appendChild.mock.calls.at(-2)[1];
  expect(button.tag).toBe('button');
  const clickCalls = dom.addEventListener.mock.calls.filter(
    ([, event]) => event === 'click'
  );
  const addHandler = clickCalls[clickCalls.length - 1][2];
  addHandler();
  expect(render).toHaveBeenCalledTimes(1);
});
