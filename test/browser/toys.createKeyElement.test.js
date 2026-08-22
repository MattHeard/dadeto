import { jest } from '@jest/globals';
import { createKeyElement } from '../../src/browser/toys.js';

describe('createKeyElement', () => {
  let mockDom;
  let keyEl;
  let textInput;
  let rows;
  let syncHiddenField;
  let disposers;

  beforeEach(() => {
    mockDom = {
      createElement: jest.fn().mockReturnValue({}),
      setType: jest.fn(),
      setPlaceholder: jest.fn(),
      setValue: jest.fn(),
      setDataAttribute: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    textInput = {};
    rows = {};
    syncHiddenField = jest.fn();
    disposers = [];
  });

  it('creates a key input element with the correct initial properties', () => {
    const key = 'testKey';

    keyEl = createKeyElement({
      dom: mockDom,
      key,
      textInput,
      rows,
      syncHiddenField,
      disposers,
    });

    expect(mockDom.createElement).toHaveBeenCalledWith('input');
    expect(mockDom.setType).toHaveBeenCalledWith(keyEl, 'text');
    expect(mockDom.setPlaceholder).toHaveBeenCalledWith(keyEl, 'Key');
    expect(mockDom.setValue).toHaveBeenCalledWith(keyEl, key);
    expect(mockDom.setDataAttribute).toHaveBeenCalledWith(
      keyEl,
      'prevKey',
      key
    );
    expect(mockDom.addEventListener).toHaveBeenCalledWith(
      keyEl,
      'input',
      expect.any(Function)
    );
    expect(disposers).toHaveLength(1);
    const disposer = disposers[0];
    expect(disposer).toBeInstanceOf(Function);

    disposer();

    expect(mockDom.removeEventListener).toHaveBeenCalledWith(
      keyEl,
      'input',
      expect.any(Function)
    );
  });

  it('removes the same listener that was added', () => {
    const key = 'testKey';

    keyEl = createKeyElement({
      dom: mockDom,
      key,
      textInput,
      rows,
      syncHiddenField,
      disposers,
    });

    const handler = mockDom.addEventListener.mock.calls[0][2];
    const disposer = disposers[0];

    disposer();

    expect(mockDom.removeEventListener).toHaveBeenCalledWith(
      keyEl,
      'input',
      handler
    );
  });

  it('calls removeEventListener each time the disposer runs', () => {
    const key = 'testKey';

    keyEl = createKeyElement({
      dom: mockDom,
      key,
      textInput,
      rows,
      syncHiddenField,
      disposers,
    });

    const disposer = disposers[0];

    disposer();
    expect(mockDom.removeEventListener).toHaveBeenCalledTimes(1);

    disposer();
    expect(mockDom.removeEventListener).toHaveBeenCalledTimes(2);
  });

  it('passes row data into the key input handler', () => {
    const rowData = { rows: { old: 'value' }, rowTypes: { old: 'string' } };
    const key = createKeyElement({
      dom: mockDom,
      key: 'old',
      textInput: {},
      rowData,
      syncHiddenField,
      disposers,
    });
    const handler = mockDom.addEventListener.mock.calls[0][2];
    mockDom.getDataAttribute = jest.fn(() => 'old');
    mockDom.getTargetValue = jest.fn(() => 'new');
    handler({ target: {} });
    expect(rowData.rows).toEqual({ new: 'value' });
    expect(mockDom.setDataAttribute).toHaveBeenLastCalledWith(
      key,
      'prevKey',
      'new'
    );
  });
});
