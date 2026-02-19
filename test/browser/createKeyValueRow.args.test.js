import { describe, it, expect, jest } from '@jest/globals';
import { createKeyValueRow } from '../../src/browser/toys.js';

describe('createKeyValueRow argument handling', () => {
  it('creates elements using provided key and value', () => {
    const rowEl = {};
    const keyInput = {};
    const valueInput = {};

    const dom = {
      createElement: jest
        .fn()
        .mockReturnValueOnce(rowEl)
        .mockReturnValueOnce(keyInput)
        .mockReturnValueOnce(valueInput)
        .mockReturnValue({}),
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
    const entries = [];
    const textInput = {};
    const rows = {};
    const syncHiddenField = jest.fn();
    const disposers = [];
    const render = jest.fn();
    const container = {};

    const rowCreator = createKeyValueRow({
      dom,
      entries,
      textInput,
      rows,
      syncHiddenField,
      disposers,
      render,
      container,
    });

    rowCreator(['alpha', 'beta'], 0);

    expect(dom.setValue).toHaveBeenNthCalledWith(1, keyInput, 'alpha');
    expect(dom.setValue).toHaveBeenNthCalledWith(2, valueInput, 'beta');
  });
});
